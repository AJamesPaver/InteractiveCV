// EV SIMULATION

window.addEventListener('DOMContentLoaded', function() {
  // We need to wait for the html to be loaded first, otherwise we can't find the elements
  
  // --- GLOBALS ---
  let scene, camera, renderer, car, container, payload;
  let simData = [];
  let isLoaded = false;

  let truckRotationY = Math.PI
  let truckRotationX = -1 * (Math.PI / 2)

  let currentIndex = 0;
  const clock = new THREE.Clock();
  let playbackSpeed = 10.0; // multiplier to speed up or slow down playback
  let currentSimTime = 0;  // tracks where we are in the simulation timeline

  const payloadOffset = new THREE.Vector3(0.7, 0, 2.5); // local offset (in car space)

  // --- LOAD CSV DATA ---
  Papa.parse('data/RouteData.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: function(results) {
      const trackData = results.data;
      initScene(trackData);
    }
  });
  // - Load the Sim Data:
  Papa.parse('data/simulation_log_20251030_144139.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: function(results) {
      simData = results.data.filter(d => d.time_s !== null && d.time_s !== undefined && !isNaN(d.time_s));
      initPlot();
      animate();
    }
  });

  // --- INITIALIZE 3D SCENE ---
  function initScene(trackData) {
    container = document.getElementById('scene-container');
    scene = new THREE.Scene();
    const color = new THREE.Color( 0x87CEEB );
    scene.background = color;
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 10000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('threeD-canvas'), antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // === Lighting ===
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(50, 100, 50);
    scene.add(directional);

    // === Draw track as a ramp ===

    // Extract top edge of ramp (elevation profile)
    const topEdge = trackData.map(p => new THREE.Vector2(p.distance_m, p.elevation_m));

    // Create bottom edge along the ground (same x distances, y=0)
    const bottomEdge = [...trackData]
      .reverse()
      .map(p => new THREE.Vector2(p.distance_m, 0));

    // Combine to form a closed ramp outline
    const rampOutline = [...topEdge, ...bottomEdge];

    // Create shape and extrude
    const rampShape = new THREE.Shape(rampOutline);
    const roadWidth = 20; // total width of road (so ±5 in z)
    const extrudeSettings = { depth: roadWidth, bevelEnabled: false };

    const rampGeometry = new THREE.ExtrudeGeometry(rampShape, extrudeSettings);
    // Center the geometry around z = 0 (by default it extends in +Z)
    rampGeometry.translate(0, 0, -roadWidth / 2);
    const rampMaterial = new THREE.MeshPhongMaterial({ color: 0xA63E1A });
    const rampMesh = new THREE.Mesh(rampGeometry, rampMaterial);

    scene.add(rampMesh);

    // === Add route line for context ===
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x808080 });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(
      trackData.map(p => new THREE.Vector3(p.distance_m, p.elevation_m, 0))
    );
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);

    // === Add ground plane for context ===
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(5000, 5000),
      new THREE.MeshLambertMaterial({ color: 0xE07A3E })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = Math.min(...trackData.map(p => p.elevation_m)) - 1;
    scene.add(ground);

    // instantiate a loader
    const loader = new THREE.OBJLoader();

    // load a resource
    loader.load(
      // resource URL
      'data/16747_Mining_Truck_v1.obj',
      // called when resource is loaded
      function ( object ) {
        car = object;
        car.scale.set(0.005, 0.005, 0.005); // adjust scaling as needed
        car.position.set(0, 0, 0);
        car.rotation.x = truckRotationX;

        scene.add( car );
        isLoaded = true;
      },
      // called when loading is in progress
      function ( xhr ) {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      },
      // called when loading has errors
      function ( error ) {
        console.log( 'An error happened' );
      }
    );

    // --- Create payload geometry (e.g., a dome) ---




    // --- Dome (half-sphere) payload geometry ---
    const radius = 1.8;
    const widthSegments = 32;
    const heightSegments = 16;

    // thetaStart = 0, thetaLength = Math.PI / 2 gives the *upper* hemisphere
    const payloadGeometry = new THREE.SphereGeometry(
      radius,
      widthSegments,
      heightSegments,
      0,                  // phiStart
      Math.PI,            // phiLength → upper half
      0,                  // thetaStart
      Math.PI             // thetaLength → upper half
    );
    const payloadMaterial = new THREE.MeshStandardMaterial({
      color: 0x6F4E37,
      roughness: 0.6,
      metalness: 0.1
    });
    payload = new THREE.Mesh(payloadGeometry, payloadMaterial);

    // --- Position relative to the car ---
    payload.position.set(0, 2.5, 0); // tweak y to sit in the truck bed

    scene.add(payload);

    camera.position.set(0, 10, 10);
    camera.lookAt(0,0,0);
  }

  // --- INITIALIZE PLOT ---
  function initPlot() {
    const time = simData.map(d => d.time_s);

    const traceSpeed = {
      x: time,
      y: simData.map(d => d.HaulTruck_speed_kph),
      name: 'Speed (kph)',
      line: {color: 'teal'},
      yaxis: 'y1'
    };

    const traceElevation = {
      x: time,
      y: simData.map(d => d.HaulTruck_elevation_m),
      name: 'Elevation (m)',
      line: {color: 'purple'},
      yaxis: 'y2'
    };

    const traceSOC = {
      x: time,
      y: simData.map(d => d.HaulTruck_battery_soc_perc),
      name: 'SOC (%)',
      line: {color: 'orange'},
      yaxis: 'y3'
    };

    const tracePower = {
      x: time,
      y: simData.map(d => d.HaulTruck_battery_power_kW),
      name: 'Battery Power (kW)',
      line: {color: 'blue'},
      yaxis: 'y4'
    };

    const layout = {
      title: 'Simulation Data',
      showlegend: false,
      margin: {t: 40, b: 40, l: 50, r: 10},
      grid: {rows: 4, columns: 1, pattern: 'independent'},
      xaxis: {title: {text: 'Time (s)'}, domain: [0, 1]},
      yaxis: {title: {text: 'Speed (kph)'}, domain: [0.7875, 1.0]},
      yaxis2: {title: {text: 'Elevation (m)'}, domain: [0.525, 0.7375]},
      yaxis3: {title: {text: 'SOC (%)'}, domain: [0.2625, 0.475]},
      yaxis4: {title: {text: 'Battery Power (kW)'}, domain: [0.0, 0.2125]},
      shapes: [
        {
          type: 'line',
          x0: 0, x1: 0,
          y0: 0, y1: 1,
          xref: 'x',
          yref: 'paper',
          line: {color: 'red', width: 2, dash: 'dot'}
        }
      ],
      annotations: []
    };

    const data = [traceSpeed, traceSOC, traceElevation, tracePower];
    Plotly.newPlot('plot', data, layout);
  }
  
  // --- UPDATE PLOT ---
  function updatePlot(currentSimTime) {
    const idx = simData.findIndex(d => d.time_s >= currentSimTime);
    if (idx <= 0 || idx >= simData.length) return;

    const d1 = simData[idx - 1];
    const d2 = simData[idx];
    const t = (currentSimTime - d1.time_s) / (d2.time_s - d1.time_s);

    const speed = d1.HaulTruck_speed_kph + (d2.HaulTruck_speed_kph - d1.HaulTruck_speed_kph) * t;
    const soc = d1.HaulTruck_battery_soc_perc + (d2.HaulTruck_battery_soc_perc - d1.HaulTruck_battery_soc_perc) * t;
    const grade = d1.HaulTruck_trackgrade_perc + (d2.HaulTruck_trackgrade_perc - d1.HaulTruck_trackgrade_perc) * t;
    const power = d1.HaulTruck_battery_power_kW + (d2.HaulTruck_battery_power_kW - d1.HaulTruck_battery_power_kW) * t;

    const update = {
      'shapes[0].x0': currentSimTime,
      'shapes[0].x1': currentSimTime,
      'annotations': [
        {
          x: 0.5,
          y: 1.1,
          xref: 'paper',
          yref: 'paper',
          text: `
            <b>t = ${currentSimTime.toFixed(2)}s</b> 
            Speed = ${speed.toFixed(1)} kph
            SOC = ${soc.toFixed(1)}% 
            Power = ${power.toFixed(1)}kW 
            Gradient = ${grade.toFixed(2)}%
          `,
          showarrow: false,
          align: 'center',
          font: {size: 12, color: '#333'}
        }
      ]
    };

    Plotly.relayout('plot', update);
  }

  // --- Smooth chase camera that follows a moving vehicle ---
  function updateChaseCamera(car, camera, deltaTime, options = {}) {
    // Default configuration
    const {
      offset = new THREE.Vector3(-10, 5, 10),     // Camera offset in car local space
      lookAhead = new THREE.Vector3(10, 1, 1),  // Point ahead of the car to look at
      followStrength = 4.0,                    // Higher = faster follow (LERP factor)
      rotationLag = 0.15                       // How much the camera lags behind car rotation
    } = options;

    // --- Step 1: Compute desired camera position ---
    const desiredOffset = offset.clone().applyQuaternion(car.quaternion);
    const desiredPosition = car.position.clone().add(desiredOffset);

    if (!isNaN(desiredPosition.x) && !isNaN(desiredPosition.y) && !isNaN(desiredPosition.z)){
      // --- Step 2: Smoothly move the camera towards that position ---
      camera.position.lerp(desiredPosition, 1 - Math.exp(-followStrength * deltaTime));
    }
    // --- Step 3: Compute look-ahead target ---
    const lookAtTarget = car.position.clone().add(
      lookAhead.clone().applyQuaternion(car.quaternion)
    );

    // --- Step 4: Smoothly rotate camera towards target (optional rotation lag) ---
    const currentDir = new THREE.Vector3();
    camera.getWorldDirection(currentDir);

    const desiredDir = lookAtTarget.clone().sub(camera.position).normalize();
    currentDir.lerp(desiredDir, rotationLag);

    if (!isNaN(currentDir.x) && !isNaN(currentDir.y) && !isNaN(currentDir.z)){
      const finalTarget = camera.position.clone().add(currentDir);
      camera.lookAt(finalTarget);
    }
  
  }

  // --- UPDATE PAYLOAD ---
  function updatePayload(car, payload, showPayload) {
    // Compute payload position in world space
    const worldOffset = payloadOffset.clone().applyQuaternion(car.quaternion);
    payload.position.copy(car.position.clone().add(worldOffset));

    // Make the payload follow car’s rotation (optional)
    payload.quaternion.copy(car.quaternion);

    // Show/hide based on signal
    payload.visible = !!showPayload;
  }

  // --- ANIMATION LOOP ---
  function animate() {
    requestAnimationFrame(animate);

      if (isLoaded) {

        if (simData.length === 0) return;

        // How much real time has passed since last frame
        const delta = clock.getDelta();
        const deltaTime = (currentSimTime + delta * playbackSpeed) - currentSimTime
        currentSimTime += delta * playbackSpeed;

        // Advance to the correct point in the data based on time
        while (
          currentIndex < simData.length - 2 &&
          currentSimTime > simData[currentIndex + 1].time_s
        ) {
          currentIndex++;
        }

        // Get current and next points
        const d1 = simData[currentIndex];
        const d2 = simData[currentIndex + 1];

        // Compute interpolation factor between 0 and 1
        const t = (currentSimTime - d1.time_s) / (d2.time_s - d1.time_s);

        // Linear interpolation of position
        car.position.x = d1.cycleDistance_m + (d2.cycleDistance_m - d1.cycleDistance_m) * t;
        car.position.y = d1.HaulTruck_elevation_m + (d2.HaulTruck_elevation_m - d1.HaulTruck_elevation_m) * t;

        // Rotate:
        let heading = truckRotationY + ((Math.PI / 180) * (d1.HaulTruck_heading_deg + (d2.HaulTruck_heading_deg - d1.HaulTruck_heading_deg) * t));
        if (heading >= (2 * Math.PI)){
          heading = heading - (2 * Math.PI)
        }
        car.rotation.z = heading;

        // Update payload:
        const showPayload = d1.HaulTruck_payloadpresent > 0;
        updatePayload(car, payload, showPayload);

        // Update the chase camera
        updateChaseCamera(car, camera, deltaTime, {
          offset: new THREE.Vector3(10, 20, 10),
          lookAhead: new THREE.Vector3(-10, 0, 2),
          followStrength: 3.5,
          rotationLag: 0.2
        });

        // update chart cursor
        updatePlot(currentSimTime);

        // Optional: restart when reaching end
        if (currentIndex >= simData.length - 2) {
          currentIndex = 0;
          currentSimTime = 0;
          clock.start();
        }

        renderer.render(scene, camera);
      }
  }

  // --- RESIZE HANDLER ---
  window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });

});
