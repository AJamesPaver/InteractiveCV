// When the user scrolls down 100px from the top of the document, slide down the navbar
// When the user scrolls to the top of the page, slide up the navbar (50px out of the top view)
window.onscroll = function() {scrollFunction()};

function scrollFunction() {
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
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