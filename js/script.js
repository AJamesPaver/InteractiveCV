// When the user scrolls down 20px from the top of the document, slide down the navbar
// When the user scrolls to the top of the page, slide up the navbar (50px out of the top view)
window.onscroll = function() {scrollFunction()};

function scrollFunction() {
    if (document.body.scrollTop > screen.height || document.documentElement.scrollTop > screen.height) {
        // Scrolled one screen height, put away the navbar again
        if (screen.width > 756) {
            // Big screen - push up the navbar
            closeNavBar();
        }
    }else{
        if (screen.width > 756) {
            // Big screen - pull down the navbar
            openNavBar();
        }
        if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
            if (screen.width < 757) {
                // Small screen - only pull down the navbar icon
                document.getElementById("navbar-icon").style.top = "24px";
            }
        } else{
            if (!document.getElementById("navbar-icon").classList.contains('change')){
                // Only hide the navbar icon if the navbar is closed!
                document.getElementById("navbar-icon").style.top = "-50px";
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
    if (!document.getElementById("navbar-icon").classList.contains('change')){
        if (screen.width < 757) {
            // Small screen - hide the navbar
            document.getElementById("navbar").style.width = "0px";
        }
    }
}

// Navbar controls:
function openNavBar() {
    // Transition the menu icon to a cross:
    document.getElementById("navbar-icon").classList.add("change");
    document.getElementById("navbar-icon").onclick = closeNavBar;
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
    document.getElementById("navbar-icon").classList.remove("change");
    document.getElementById("navbar-icon").onclick = openNavBar;
    // Close the navbar
    if (screen.width > 756) {
        // Big screen - push up the navbar
        document.getElementById("navbar").style.top = "-80px";
    }else{
        // Small screen - set the width to zero
        document.getElementById("navbar").style.width = "0px";
    }
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
