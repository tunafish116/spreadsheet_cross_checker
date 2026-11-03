/**
 * Accurant Biotech
 * 
 *      S preadsheet
 *      O riented
 *      N otation
 *      I nconsistency
 *      C hecker
 * 
 * @author Derrick Yu
 * @version 6.5
 * Date: 8-2-24
 */


Files:

    index.html
        index file for the website.
        Referenced scripts:
            jquery-3.7.1.min.js
            xlsx.full.min.js
            string_comparator.js
            script.js
        Referenced stylesheets:
            common.css
            light.css
            dark.css

    script.js
        Dependencies: jquery-3.7.1.min.js, xlsx.full.min.js
        This script must be referenced for the website to function.
        Handles website UI, file importing, populating the table, downloading selection, and the search/sort/filter stuff.

    string_comparator.js
        Dependencies: script.js, jquery-3.7.1.min.js
        This script contains everything needed to perform file cross-checking.
    
    jquery-3.7.1.min.js
        Vendored library. Used for replacing html elements.
    
    xlsx.full.min.js
        Vendored library. Used for parsing excel and csv files.

    common.css
        Main stylesheet for the website.

    light.css
        Stylesheet containing light mode specific styling.

    dark.css
        Stylesheet containing dark mode specific styling.


Assets:

    Accurant-Logo-Small.png - website tab icon
    experimental.png - website background
    lights1.png
    lights2.png
    sonic-full_speed_run.gif









