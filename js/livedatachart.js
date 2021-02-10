// LIVE DATA CHART
function rand() {
    return Math.random();
}

window.addEventListener('DOMContentLoaded', function() {
    // We need to wait for the html to be loaded first, otherwise we can't find the elements
    
    var arrayLength = 60
    var Channel1    = []
    var Channel2    = []

    for(var i = 0; i < arrayLength; i++) {
        var y1 = Math.round(Math.random()*20) + 10
        var y2 = Math.random() + 1
        Channel1[i] = y1
        Channel2[i] = y2
    }

    var trace1 = {
        name: 'Channel 1',
        y: Channel1,
        mode: 'lines',
        line: {
          color: '#80CAF6',
          shape: 'spline'
        }
    }

    var trace2 = {
        name: 'Channel 2',
        y: Channel2,
        xaxis: 'x2',
        yaxis: 'y2',
        mode: 'lines',
        line: {
            color: '#d72323',
            shape: 'spline'
        }
      };
      
    var layout = {
        plot_bgcolor: "black",
        paper_bgcolor:"black",
        font: {
            color: "white"
        },
        xaxis: {
            domain: [0, 1],
            showticklabels: false,
        },
        yaxis: {
            domain: [0.52,1],
            gridcolor: "white"
        },
        xaxis2: {
            anchor: 'y2', 
            domain: [0, 1],
        },
        yaxis2: {
            anchor: 'x2', 
            domain: [0, 0.48],
            gridcolor: "white"
        },  
    }

    var data = [trace1, trace2]; 

    Plotly.plot('live-data-plot', data, layout);

    var interval = setInterval(function() {
    
        var y1 = Math.round(Math.random()*20) + 10
        Channel1 = Channel1.concat(y1)
        Channel1.splice(0, 1)
        
        var data_update = {
            y: [Channel1]
        };
        
        Plotly.update('live-data-plot', data_update, {}, [0])
    }, 500);

    var interval = setInterval(function() {
    
        var y2 = Math.random() + 1
        Channel2 = Channel2.concat(y2)
        Channel2 = Channel2.concat(y2)
        Channel2.splice(0, 2)

        var data_update = {
            y: [Channel2]
        };
        
        Plotly.update('live-data-plot', data_update, {}, [1])
        
    }, 1000);

});
