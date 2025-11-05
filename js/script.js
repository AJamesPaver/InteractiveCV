
let ignoreScroll = false; // Global flag to disable scrollFunction temporarily

// When the user scrolls down 20px from the top of the document, slide down the navbar
// When the user scrolls to the top of the page, slide up the navbar (50px out of the top view)
window.onscroll = function() {
  if (!ignoreScroll) scrollFunction();
};

function scrollFunction() {

    /*
    if (document.body.scrollTop > (screen.height-100) || document.documentElement.scrollTop > (screen.height-100)) {
        // Scrolled one screen height, put away the navbar again
        if (screen.width > 756) {
            // Big screen - push up the navbar
            closeNavBar();
        }
    } else if (document.body.scrollTop > (screen.height/2) || document.documentElement.scrollTop > (screen.height/2)) {
        const element = document.getElementById('hero-picture-top');
        if (element) {
            if (!element.classList.contains('fullheight')){
                // Scrolled HALF screen height, put away the navbar again
                if (screen.width > 756) {
                    // Big screen - push up the navbar
                    closeNavBar();
                }
            }
        }
    } else if ((document.body.scrollTop == 0) && (document.documentElement.scrollTop == 0)) {*/
    if ((document.body.scrollTop == 0) && (document.documentElement.scrollTop == 0)) {
        // At the top of the screen, hide everything:
        if (!document.getElementById("hamburger-icon").classList.contains('change')){
            // Only hide the navbar icon if the navbar is closed!
            document.getElementById("hamburger-icon").style.top = "-50px";
            if (screen.width < 757) {
                // Small screen - hide the navbar
                document.getElementById("navbar").style.width = "0px";
            }
        }
        // Show the icon:
        document.getElementById("navbar-icon").style.opacity = "1";
        if (screen.width > 756) {
            // Big screen - push up the navbar
            closeNavBar();
            document.getElementById("navbar-icon").classList.add("navbar-icon-center");
            document.getElementById("navbar-icon").classList.remove("navbar-icon-grey");
        }
    } else {
        if (screen.width > 756) {
            // Big screen - pull down the navbar
            openNavBar();
            document.getElementById("navbar-icon").classList.remove("navbar-icon-center");
            document.getElementById("navbar-icon").classList.add("navbar-icon-grey");
        }
        if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
            if (screen.width < 757) {
                // Small screen - only pull down the hamburger icon
                document.getElementById("hamburger-icon").style.top = "24px";
                // Hide the icon:
                document.getElementById("navbar-icon").style.opacity = "0";
            }
        } else{
            if (!document.getElementById("hamburger-icon").classList.contains('change')){
                // Only hide the navbar icon if the navbar is closed!
                document.getElementById("hamburger-icon").style.top = "-50px";
                if (screen.width < 757) {
                    // Small screen - hide the navbar
                    document.getElementById("navbar").style.width = "0px";
                }
            }
        }
    }
}

// Window resize function to tidy-up the navbar if the screen size is reduced
window.onresize = function() {resizeFunction()};

function resizeFunction() {
    if (!document.getElementById("hamburger-icon").classList.contains('change')){
        if (screen.width < 757) {
            // Small screen - hide the navbar
            document.getElementById("navbar").style.width = "0px";
        }
    }
}

// Navbar controls:
function openNavBar() {
    // Transition the menu icon to a cross:
    document.getElementById("hamburger-icon").classList.add("change");
    document.getElementById("hamburger-icon").onclick = closeNavBar;
    // Open the navbar
    if (screen.width > 756) {
        // Big screen - pull down the navbar
        document.getElementById("navbar").style.top     = "0";
        document.getElementById("navbar").style.width   = "100%";
    }else{
        // Small screen - pull across the navbar
        document.getElementById("navbar").style.top     = "0";
        document.getElementById("navbar").style.width   = "250px";
    }
}
function closeNavBar() {
    // Transition the menu icon to a cross:
    document.getElementById("hamburger-icon").classList.remove("change");
    document.getElementById("hamburger-icon").onclick = openNavBar;
    // Close the navbar
    if (screen.width > 756) {
        // Big screen - push up the navbar
        document.getElementById("navbar").style.top = "-100px";
    }else{
        // Small screen - set the width to zero
        document.getElementById("navbar").style.width = "0px";
    }
}
function navigateAndClose() {
    ignoreScroll = true;        // Disable scroll-triggered navbar behavior
    closeNavBar();              // Close it immediately

    // Let the page scroll naturally to the section
    setTimeout(() => {
        ignoreScroll = false;     // Re-enable scroll behavior after 800 ms
    }, 1500);                    // Adjust delay if your scroll animation is slower
}

// When the user clicks on the button, scroll to the top of the document
function topFunction() {
    document.body.scrollTop = 0;            // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
  }

//Intersection observers
const appearOptions = {
    threshold: 1  // This dictates only when the whole element is inside the intersection it should fire
};
const appearOnScroll = new IntersectionObserver(
    function(entries, appearOnScroll){
        entries.forEach(entry => {
            if (!entry.isIntersecting){
                // Do nothing if not intersecting yet
                return
            } else {
                // Add the appear class:
                entry.target.classList.add('appear');
                // Stop looking for this element anymore:
                appearOnScroll.unobserve(entry.target);
            }
        })
    },
    appearOptions
);

// Now hook-up the intersection observer to the elements inside "faders"
window.addEventListener('DOMContentLoaded', function() {
    // We need to wait for the html to be loaded first, otherwise we can't find the elements

    // Find all the fade classes in the document
    const faders = document.querySelectorAll('.fade-in');

    // Attach each fader to the intersection observer
    faders.forEach(fader => {
        appearOnScroll.observe(fader);
    })
});
