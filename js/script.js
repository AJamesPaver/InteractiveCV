// When the user scrolls down 20px from the top of the document, slide down the navbar
// When the user scrolls to the top of the page, slide up the navbar (50px out of the top view)
window.onscroll = function() {scrollFunction()};

function scrollFunction() {
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        document.getElementById("navbar-icon").style.top = "24px";
    } else if (!document.getElementById("navbar-icon").classList.contains('change')){
        // Don't hide the close navbar button if the navbar is open!
        document.getElementById("navbar-icon").style.top = "-50px";
    }
}

// Left hand navbar controls:
function openNavBar() {
    // Transition the menu icon to a cross:
    document.getElementById("navbar-icon").classList.toggle("change");
    document.getElementById("navbar-icon").onclick = closeNavBar;
    // Open the navbar
    document.getElementById("navbar").style.width = "250px";
}
function closeNavBar() {
    // Transition the menu icon to a cross:
    document.getElementById("navbar-icon").classList.toggle("change");
    document.getElementById("navbar-icon").onclick = openNavBar;
    // Close the navbar
    document.getElementById("navbar").style.width = "0px";
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
