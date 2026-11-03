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
 */


//initializating variables

//tweakable parameters
let checkProportion;
let errorTolerance;
let logUniErrors;
let logNull;
let sortOutput;
let MCThreshold;
let MCTolerance;
let rowShiftCheckLength;

initializeVariables();
function initializeVariables(){
    checkProportion = hasCookie("checkProportion")? parseFloat(getCookie("checkProportion")):0.5; //default 0.5
    errorTolerance = hasCookie("errorTolerance")? parseFloat(getCookie("errorTolerance")):0.02; //default 0.02
    logUniErrors = hasCookie("isColumn")? getCookie("isColumn")=="true":true; //default true
    logNull = hasCookie("isNull")? getCookie("isNull")=="true":true; //default true
    sortOutput = hasCookie("isSort")? getCookie("isSort")=="true":true; //default true
    MCThreshold = hasCookie("MCThreshold")? parseFloat(getCookie("MCThreshold")):0.07; //default 0.07
    MCTolerance = hasCookie("MCTolerance")? parseFloat(getCookie("MCTolerance")):4; //default 4
    rowShiftCheckLength = hasCookie("rowShiftCheckLength")? parseInt(getCookie("rowShiftCheckLength")):10; //default 10
}

//Hard coded parameters, DO NOT USE const to define
let randomSample = true; //default true
let doDelay = true; //default true (for user experience)

// Recognized data formatss
const UNIFORM = 2, BALANCED = 0, UNBALANCED = 1,
    NO_FORMAT = 0, EXACT_FORMAT = 1, MULTIPLE_CHOICE = 2, NUMERIC = 3, DATE = 4; TIME = 5;

// Regular Expressions to search for date, time, and numeric data types.
const numericRegex = /^[0-9]*(\.)?[0-9]*$/;
const dateRegex_DMY = /^(?:(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](\d{2}|\d{4})|([0-2]?[0-9]|3[01])-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-(\d{2}|\d{4}))$/i;
const dateRegex_MDY = /^(?:(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](\d{2}|\d{4})|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-([0-2]?[0-9]|3[01])-(\d{2}|\d{4}))$/i;
const dateRegex_literal = /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, \d{4}$/i;
const timeRegex_military = /^(0?[0-9]|1[0-9]|2[0-3]):?[0-5][0-9]$/;
const timeRegex_normal = /^(0?[1-9]|1[0-2]):[0-5][0-9] ?(p|a)m/;


const MMM_MAP = new Map([["jan",1],["feb",2],["mar",3],["apr",4],["may",5],["jun",6],["jul",7],["aug",8],["sep",9],["oct",10],["nov",11],["dec",12],]);
const Month_MAP = new Map([["january",1],["february",2],["march",3],["april",4],["may",5],["june",6],["july",7],["august",8],["september",9],["october",10],["november",11],["december",12],]);

//initialize progress bar
updateProgressBar(0);




//************************************************************************//
// --------------------------- MAIN ALGORITHM --------------------------- //

/**
 * async to create fake progress bar delay
 * @requires tables - Global array of 2D json arrays representing collection of raw data
 * 
 * Limitations:
 * minimum length bottlenecked by certain checks. recommended minimum 30 rows of data
 * may, in certain cases mark correct data as mismatched due to extraneous column matching
 * this can be fixed by lowering the error tolerance or deleting extraneous columns from the spreadsheet
 * If too little errors are found, you may want to increase the error tolerance so the program will match more columns
 * 
 * Overview:
 * This algorithm has 3 main parts that are executed sequentially
 *      Step 1. Analyze each column. Record metadata on each column and use it to place columns into certain groups
 *      Step 2. Within each group of similar columns, cross check columns with a certain error tolerance each other to find matches
 *      Step 3. For each group of matched columns, cross check again, this time outputing any 
 *              discrepancies between columns and format errors within columns
 */
async function RUN_AUTO_CROSSCHECK(){
    if(tables.length == 0){
        window.alert("No files to cross check!");
        return;
    }

    let cellCount = 0;
    let columnCount = 0;
    
    let list = document.createElement('ul');
    list.id = "output-list";
    $("#output-list").replaceWith(list);
    await updateProgressBar(0);

    console.log("\n\n\n\nCross checking started");
    //convert file[table[row[column]]] format into file[table[column[row]]] format stored as "sheets"
    let sheets = [];
    for(let i=0; i<tables.length; i++){
        sheets[i] = new Array(tables[i][tables[i].titleRow].length);
        for(let j=0; j<sheets[i].length; j++){
            sheets[i][j] = new Array(tables[i].length-tables[i].titleRow);
            sheets[i][j].parentTable = i;
            sheets[i][j].index = j;
        }
        let l=0;
        for(let j=tables[i].titleRow; j<tables[i].length; j++){
            for(let k=0; k<tables[i][tables[i].titleRow].length; k++){
                if(tables[i][j][k] == null){
                    sheets[i][k][l] = "";
                }else{
                    sheets[i][k][l] = tables[i][j][k];
                }
            }
            l++;
        }
    }

    //remove columns with class "ignore"
    if(document.getElementById("selectIgnore").value == "Blacklist"){
        for(let i=0; i<sheets.length; i++){
            for(let j=sheets[i].length-1; j>=0; j--){
                if(tables[i].colMetaData[j]){
                    sheets[i].splice(j,1);
                }
            }
        }
    }else{
        for(let i=0; i<sheets.length; i++){
            for(let j=sheets[i].length-1; j>=0; j--){
                if(!tables[i].colMetaData[j]){
                    sheets[i].splice(j,1);
                }
            }
        }
    }



    // count columns and cells and turn off fake progress bar delay if data set is too large
    for(let i=0; i<sheets.length; i++){
        for(let j=0;j<sheets[i].length; j++){
            cellCount+= sheets[i][j].length;
            columnCount++;
        }
    }
    if(cellCount>150000 || columnCount>150){
        doDelay = false;
    }else{
        doDelay = true;
    }


    // *********************** //
    // Step 1. Analyze Columns //

    let temp = 0; //unimportant, used for progress bar tracking

    //Loop through each column in each file
    for(let i=0; i<sheets.length; i++){
        for(let j=0;j<sheets[i].length; j++){
            temp++;
            await updateProgressBar(0.25*(i/sheets.length+1/sheets.length/sheets[i].length*j),1,"Analyzing Columns... "+temp+"/"+columnCount);

            //sheets[i][j] is an entire column of data stored as "column"
            const column = sheets[i][j];

            //replace all new line characters in titles with spaces for proper formatting in output
            column[0] = column[0].replaceAll("\n"," ");


            // Generate a random sample of the column that will be used to analyze the column. 
            // Analyzing the entire column is unnecessary and inefficient
            // metadata will still be stored under the actual "column" instead of the sample
            let randSample = getRandomIndexSample(column);
            let checkLength = randSample.length;
            let arr = Array(checkLength);
            for(let k=0; k<checkLength; k++){
                arr[k] = column[randSample[k]].length;
            }


            // Step 1.1 Run Balance Check
            
            // generate a freqency array of all unique values in the column
            countDistinct(column,1);
            column.maxFreq = column.freq.reduce((a, b) => Math.max(a, b), -Infinity);
            if(column.maxFreq>(column.length-1)*(1-errorTolerance*0.3)){
                //if over 99 percent of values are the same, mark column as "UNIFORM"
                findCommonOccurance(column);
                column.balanceType = UNIFORM;
                column.formatType = 6;
            }else if(column.maxFreq>(column.length-1)*Math.max(1-errorTolerance*8,0.6)){
                //if over 60% of the values are the same, mark column as "UNBALANCED"
                column.balanceType = UNBALANCED;
            }else{
                //otherwise, the column is "BALANCED"
                column.balanceType = BALANCED;
            }


            // Step 1.2 Run Date/Time Check

            //Checks columns for 5 Date/Time formats using "chances" for efficiency

            // ************ What are "chances"? ***************
            // we can say a column matches a certain format if over 90% of the data matches that format
            // that means that as we loop through the data,
            // if >10% of the total data is wrong, we can exit out of the loop early
            // "chances" are the number of mismatches allowed until we stop checking that column for matches
            // most columns will drop out of every other format after the first %10 of iterations
            // chances are used in other places in this algorithm to boost efficiency when running an expensive function

            if(column.balanceType <= UNBALANCED){
                const chances = Array(5).fill(checkLength*errorTolerance*2);
                let text = "";
                for(let k=0; k<checkLength; k++){
                    text = column[randSample[k]];
                    if(chances[0]>0 && !dateRegex_DMY.test(text)){
                        chances[0]--;
                    }
                    if(chances[1]>0 && !dateRegex_MDY.test(text)){
                        chances[1]--;
                    }
                    if(chances[2]>0 && !dateRegex_literal.test(text)){
                        chances[2]--;
                    }
                    if(chances[3]>0 && !timeRegex_military.test(text)){
                        chances[3]--;
                    }
                    if(chances[4]>0 && !timeRegex_normal.test(text)){
                        chances[4]--;
                    }
                }

                let max = -1, maxIndex = 0;
                for(let k=0; k<chances.length; k++){
                    if(chances[k]>max){
                        max = chances[k];
                        maxIndex = k;
                    }
                }
                if(max>0){
                    if(maxIndex <= 2){
                        column.formatType = DATE + maxIndex*0.1;
                    }else{
                        column.formatType = TIME + (maxIndex-3)*0.1;
                    }
                    continue;
                }


                // Step 1.3 Run multiple choice format check
                if(column.freq.length < column.length*MCThreshold || column.freq.length < 10){
                    // if the amount of unique values is less than 7% of all values,
                    // mark the column as multiple choice
                    column.formatType = MULTIPLE_CHOICE;
                    continue;
                }

                if(column.balanceType == UNBALANCED){
                    column.formatType = NO_FORMAT;
                    continue;
                }


                // Step 1.4 Run exact format check

                findCommonOccurance(arr);
                if(arr.commonCount>(checkLength-1)*(1-errorTolerance*2)){
                    const length = arr.commonValue;
                    
                    //if over 90% of the checked portion has the same length,
                    //check for exact format
                    if(arr.freq.length > 1){
                        for(let k=checkLength-1; k>=0; k--){
                            if(arr[k] != arr.commonValue){
                                arr.splice(k,1);
                                randSample.splice(k,1);
                            }
                        }
                    }
                    checkLength = arr.length;
                    let format = "";
                    for(let k=0; k<length; k++){
                        for(let l=0; l<checkLength; l++){
                            arr[l] = column[randSample[l]][k];
                        }
                        findCommonOccurance(arr);

                        if(arr.commonCount>(checkLength-1)*(1-errorTolerance)){
                            //check for exact match
                            format += arr.commonValue;
                        }else{
                            //check for numeric match
                            let count = 0;
                            for(let l=0; l<checkLength; l++){
                                if(/[0-9]/.test(arr[l])){
                                    count++;
                                }
                            }
                            if(count>(checkLength-1)*(1-errorTolerance)){
                                format += "▄";
                            }else{
                                format += "█";
                            }
                        }
                    }

                    //In the case that the column is EXACT_FORMAT, the column will have a regex string attached as metadata
                    // Examples of exact format data would be barcode ID, accurant ID, or subject ID
                    // "▄" - any digit      "█" - any character     "A" - exact match for the character "A"
                    // example barcode regex: 0019#######, 0#######
                    // example subject ID regex 0##-0##, 1##0##
                    // example Accurant ID regex: AA#######, ..#######
                    column.regex = format;
                    column.regExp = new RegExp("^"+format.replaceAll(".","\\.").replaceAll("▄","\\d").replaceAll("█",".")+"$");
                    column.formatType = EXACT_FORMAT;
                    continue;
                }

                // Step 1.4 run numeric check
                let count = 0;
                for(let k=0; k<checkLength; k++){
                    if(numericRegex.test(column[randSample[k]])){
                        count++;
                    }
                }

                if(count>checkLength*(1-errorTolerance)){
                    column.formatType = NUMERIC;
                    continue;
                }

                // Any column that does not match any format above will be marked as "NO_FORMAT"
                // and will be cross checked using exact matching, the most basic, but inflexible method of cross checking.
                // Comments, and other columns with unique, but unformatted data, will be marked as "NO_FORMAT"
                column.formatType = NO_FORMAT;
            }
        }
    }

    console.log("sheets",sheets);

    // ************************ //
    // Step 2. Matching Columns //


    //Step 2.1
    // Place each column into a group based on previously analyzed format. There are seven groups.
    let allGroups = groupColumns();
    function groupColumns(){
        let allGroups = Array(7);
        for(let i=0; i<7; i++){
            allGroups[i] = [];
        }
    
        for(let i=0; i<sheets.length; i++){
            for(let j=0; j<sheets[i].length; j++){
                if(sheets[i][j].balanceType == UNIFORM){
                    allGroups[0].push(sheets[i][j]);
                    continue;
                }
                let format = Math.floor(sheets[i][j].formatType);
                if(format == NO_FORMAT){
                    allGroups[1].push(sheets[i][j]);
                }else if(format == EXACT_FORMAT){
                    allGroups[2].push(sheets[i][j]);
                }else if(format == MULTIPLE_CHOICE){
                    allGroups[3].push(sheets[i][j]);
                }else if(format == NUMERIC){
                    allGroups[4].push(sheets[i][j]);
                }else if(format == DATE){
                    allGroups[5].push(sheets[i][j]);
                }else if(format == TIME){
                    allGroups[6].push(sheets[i][j]);
                }
            }
        }
        return allGroups;
    }

    // I have to do this jank or else allGroups isn't logged properly in console.
    // I think it has to do with explicitly defined arrays vs mutable lists but that's just a guess.
    // I don't understand how it works, just leave it.
    let logGroups = [7];
    for(let i=0; i<7; i++){
        logGroups[i] = [allGroups[i].length];
        for(let j=0; j<allGroups[i].length; j++){
            logGroups[i][j] = allGroups[i][j];
        }
    }
    console.log("groups",logGroups);



    //Step 2.2
    //for the columns in each group check if they are matching. 
    // This is the most time complex portion of the algorithm: O(n²) optimized
    // This is unavoidable, but the algorithm is already instant so whatever. I literally have to add delay so people know it's working

    let matches = await MatchColumns(allGroups);
    async function MatchColumns(groups, num){ // pay no attention to num
        //array of column matches
        let matches = [];

        //Loop through all groups of columns
        for(let i=0; i<groups.length; i++){
            let hasMatch = true;
            let match = [];
            let group = groups[i];

            // while there are still columns to match, try matching columns and remove columns that match
            while(group.length > 1){
                await updateProgressBar(0.25+0.3*(i/groups.length),1,"Matching Columns... "+i+"-"+group.length);
                hasMatch = false;
                match = [group[0]];
                //try matching the first column to the rest of the columns in the group
                for(let j=1; j<group.length; j++){
                    //The important function is isMatchCol(). See method documentation

                    //If a match is found, the column is removed from the group and added to the match
                    if(isMatchCol(group[0], group[j],num)){
                        hasMatch = true;
                        match.push(group[j]);
                        group.splice(j,1);
                        j--;
                    }
                }
                if(hasMatch){
                    // push a new match onto the list of matching columns
                    matches.push(match);
                }

                //the first column is removed regardless of whether it found a match or not.
                // if no match, column is useless.
                group.shift();
            }
        }
        return matches;
    }

    






    // ********************************************** //
    // Step 3. Cross Checking Between Matched Columns //



    let outputs = await crossCheckColumns();
    async function crossCheckColumns(){
        temp = 0; //unimportant, used for progress bar tracking
        let output = [];

        // Loop through each set of matching columns
        for(let i=0; i<matches.length; i++){
            output.push([0].concat(matches[i]));

            //Loop through the columns in each set
            for(let j=0; j<matches[i].length; j++){
                temp++;
                await updateProgressBar(0.55+0.25*(i/matches.length+1/matches.length/matches[i].length*j),1,"Cross Checking... "+temp);
                const col1 = matches[i][j];


                // Step 3.1 Check for format inconsistencies within columns and log
                // format inconsistencies do not apply to all types of columns, only "NUMERIC", "EXACT_FORMAT", "DATE", and "TIME"
                // there is no such thing as format inconsistencies in "MULTIPLE_CHOICE" columns, which rely on set matching,
                // or "NO_FORMAT", which is self explanatory

                if(col1.formatType == EXACT_FORMAT){
                    for(let k=1; k<col1.length; k++){
                        if(!col1.regExp.test(col1[k])){
                            output.push([k, col1]);continue;
                        }
                    }
                }

                if(col1.formatType == DATE){
                    for(let k=1; k<col1.length; k++){
                        if(col1.formatType == 4 && !dateRegex_DMY.test(col1[k])){
                            output.push([k, col1]);continue;
                        }else if(col1.formatType == 4.1 && !dateRegex_MDY.test(col1[k])){
                            output.push([k, col1]);continue;
                        }else if(col1.formatType == 4.2 && !dateRegex_literal.test(col1[k])){
                            output.push([k, col1]);continue;
                        }
                    }
                }

                if(col1.formatType == TIME){
                    for(let k=1; k<col1.length; k++){
                        if(col1.formatType == 5 && !timeRegex_military.test(col1[k])){
                            output.push([k, col1]);continue;
                        }else if(col1.formatType == 5.1 && !timeRegex_normal.test(col1[k])){
                            output.push([k, col1]);continue;
                        }
                    }
                }

                if(col1.formatType == NUMERIC){
                    for(let k=1; k<col1.length; k++){
                        if(col1[k] != "" && !/[+-]?([0-9]*[.])?[0-9]+/.test(col1[k])){
                            output.push([k, col1]);continue;
                        }
                    }
                }

                if(j==matches[i].length-1){
                    continue;
                }


                // Step 3.2, check for discrepancies between columns, different methods are used depending on the format
                // the most complicated of these methods is the set matching method for "MULTIPLE_CHOICE" columns. See documentation

                const col2 = matches[i][j+1];
                const minLength = Math.min(col1.length, col2.length);

                if(col1.formatType == MULTIPLE_CHOICE){

                    // this one's hard to understand, so hold onto your hats!
                    // "choiceMap" is a map with a key of "cell1value;cell2value" and and a value of a unique index
                    // the index corresponds to a freqency list, so that every time a combination of cell1 and cell2 is seen,
                    // the freqency list is iterated to record how many times it has seen that combination
                    // this map is not unique for cell1 values or cell2 values, only the combinaton of cell1 and cell2
                    // in other words, this map will record "W4;Day 28", and "W4;Day 28 EOI" as seperate entries, even though W4 is shared
                    let choiceMap = new Map();
                    let freq = [];
                    for(let k=1; k<col1.length; k++){
                        let key = col1[k]+";"+col2[k];
                        if(choiceMap.has(key)){
                            freq[choiceMap.get(key)]++;
                        }else{
                            choiceMap.set(key, freq.length);
                            freq[freq.length] = 1;
                        }
                    }
            
                    let map1 = new Map(), map2 = new Map();
                    const keys = choiceMap.keys();
            
                    // now, we will iterate through the map we created
                    for(let k=0; k<freq.length; k++){
                        let split = keys.next().value.split(";",2);

                        //if we haven't seen cell1 or cell2, add it to map1 and map2 respectively, see "else{}"
                        //if either cell1 or cell2 has been seen before
                        if(map1.has(split[0]) || map2.has(split[1])){

                            //compare the last time we saw cell1/cell2 to this time
                            let index = 0;
                            if(map1.has(split[0])){
                                index = map1.get(split[0]);
                            }else{
                                index = map2.get(split[1]);
                            }

                            //if the last time cell1/cell2 appeared had a freqency of more than 4x this time cell1/cell2 appeared or vice versa,
                            // invalidate the smaller fish by setting its freqency to 0
                            //else, both are allowed to live in harmony
                            if(freq[k] >= MCTolerance*freq[index]){
                                freq[index] = 0;
                                map1.set(split[0],k);
                                map2.set(split[1],k);
                            }else if(freq[index] >= MCTolerance*freq[k]){
                                freq[k] = 0;
                            }
                            
                        }else{
                            map1.set(split[0],k);
                            map2.set(split[1],k);
                        }
                    }
                    //by the end of this loop, we should have a map of all unique pairs of columns,
                    //where the invalid combinations have their frequencies set to 0

                    //finally, we can cross check
                    for(let k=1; k<minLength; k++){
                        let key = col1[k]+";"+col2[k];
                        //if the combination is invalid, log a mismatch
                        if(freq[choiceMap.get(key)] == 0){
                            output.push([k, col1, col2]);
                        }
                    }
            
                }

                if(col1.formatType == EXACT_FORMAT){
                    for(let k=1; k<minLength; k++){
                        if(parseXF(col1[k], col1.regex) != parseXF(col2[k], col2.regex)){
                            output.push([k, col1, col2]);
                        }
                    }
                }



                if(col1.formatType == NO_FORMAT){
                    for(let k=1; k<minLength; k++){
                        if(col1[k] != col2[k]){
                            output.push([k, col1, col2]);
                        }
                    }
                }

                if(col1.formatType == NUMERIC){
                    for(let k=1; k<minLength; k++){
                        if(parseFloat(col1[k]) != parseFloat(col2[k])){
                            output.push([k, col1, col2]);
                        }
                    }
                }

                if(Math.floor(col1.formatType) == DATE){
                    for(let k=1; k<minLength; k++){
                        if(parseDate(col1[k], col1.formatType) != parseDate(col2[k], col2.formatType)){
                            output.push([k, col1, col2]);
                        }
                    }
                }

                if(Math.floor(col1.formatType) == TIME){
                    for(let k=1; k<minLength; k++){
                        if(parseTime(col1[k], col1.formatType) != parseTime(col2[k], col2.formatType)){
                            output.push([k, col1, col2]);
                        }
                    }
                }
            }
        }
        return output;
    }


    allGroups = groupColumns();
    //normal
    let temp2 = doDelay;
    doDelay = false;
    let matches2 = await MatchColumns(allGroups, rowShiftCheckLength);
    if(matches2.length>matches.length){
        matches = matches2;
        let outputs2 = await crossCheckColumns();
        outputs2.sort((a, b) => a[0] - b[0]);

        if(outputs2.length>3*outputs.length){
            let firstMismatchIndex = 0;
            for(let i=0; i<outputs2.length; i++){
                if(outputs2[i][0] != 0){
                    firstMismatchIndex = i;
                    break;
                }
            }

            consecutiveErrorCount = 0;
            consecutiveErrorIndex = outputs2[firstMismatchIndex][0];
            for(let i=firstMismatchIndex+1; i<outputs2.length; i++){
                if(consecutiveErrorCount >= Math.floor(sheets[0][0].length*errorTolerance)){
                    addOutputItem(
                        "<b class=\"red-text\" style=\"pointer-events: none;\">WARNING!!! Possible row shift at >Row "+consecutiveErrorIndex+"\n"+
                        "           Please verify that all rows are in the correct order.</b>"
                    );
                    outputs =  await crossCheckColumns();
                    break;
                }
                if(outputs2[i][0] == outputs2[i-1][0]){
                    continue;
                }
                if(outputs2[i][0] == outputs2[i-1][0]+1){
                    consecutiveErrorCount++;
                }else{
                    consecutiveErrorCount = 0;
                    consecutiveErrorIndex = outputs2[i-1][0];
                }
            }
        }
    }
    doDelay = temp2;
    console.log("matches",matches);


    // temporary check for uniform columns (seperate from others)
    if(logUniErrors){
        for(let i=0; i<sheets.length; i++){
            for(let j=0; j<sheets[i].length; j++){
                column = sheets[i][j];
                if(column.balanceType == UNIFORM){
                    if(column.commonValue != ""){
                        for(let k=1; k<sheets[i][j].length; k++){
                            if(column.commonValue != column[k]){
                                logFormatError(column,k);
                            }
                        }
                    }
                }
            }
        }
    }

    
    //sort by row (if specified)
    if(sortOutput){
        outputs.sort((a, b) => a[0] - b[0]);
    }

    //print outputs
    for(let i=0; i<outputs.length; i++){
        output = outputs[i]
        if(output[0] == 0){
            output.shift();
            logMatch(output);
        }else if(output.length == 2){
            logFormatError(output[1], output[0]);
        }else if(output.length == 3){
            logMismatch(output[1], output[2], output[0]);
        }
    }

    await updateProgressBar(1,1,"Done!");
    console.log("Cross checking done!");
}

function getRandomIndexSample(column, percent=checkProportion){
    if(percent>1){percent = 1;}
    let checkLength = Math.floor(Math.max(Math.min(100, column.length-2),(column.length-2)*percent));
    let randSample = generateSet(checkLength, 1,column.length-1);
    return randSample;
}

/**
 * 
 * @param {*} col1 first column
 * @param {*} col2 second column
 * @returns a boolean, whether or not the first and second column match
 */
function isMatchCol(col1, col2, num = null){
    if(col1[0] == "" || col2[0] == ""){
        // columns with blank titles are rejected
        return false;
    }
    if(col1.balanceType != col2.balanceType){
        // columns with different balance types are not compared
        return false;	
    }
    if(col1.balanceType == UNIFORM){
        // uniform columns are not matched or checked
        return false;
    }

    if(Math.floor(col1.formatType) != Math.floor(col2.formatType)){
        //columns with different formats are not compared
        //(unnecessary since I'm checking within groups of same type but good practice in case I use this method somwhere else)
        return false;
    }

    let chances, randIndex;

    // if the column is unbalanced (most values are the same), 
    // twice as many values are checked and the error tolerance is twice as strict
    let minCol = col1.length<col2.length? col1:col2;
    if(num == null){
        if(col1.balanceType == BALANCED){
            randIndex = getRandomIndexSample(minCol);
            chances = randIndex.length*errorTolerance*2;
        }else{
            randIndex = getRandomIndexSample(minCol, checkProportion*2);
            chances = randIndex.length*errorTolerance;
        }
    }else{
        let temp = randomSample;
        randomSample = false;
        //randIndex = getRandomIndexSample(minCol);
        randIndex = generateSet(Math.min(num,minCol.length-1),1,minCol.length-1);
        randomSample = temp;
        chances = 0.1;
        //chances = randIndex.length*errorTolerance;
    }

    
    let sample1 = [], sample2 = [];
    for(let i=0; i<randIndex.length; i++){
        sample1[i] = col1[randIndex[i]];
        sample2[i] = col2[randIndex[i]];
    }

	if(col1.formatType == MULTIPLE_CHOICE){
        //does something, too lazy to document, ask Derrick for clarification
		let choiceSet = new Set();
        let set1 = new Set(), set2 = new Set();
		for(let i=0; i<sample1.length; i++){
            let key = sample1[i]+";"+sample2[i];
			if(!choiceSet.has(key)){
                if(set1.has(sample1[i]) || set2.has(sample2[i])){
                    chances--;
                }else{
                    choiceSet.add(key);
                    set1.add(sample1[i]);
                    set2.add(sample2[i]);
                }
            }
		}

        return chances>=0;
    }

    if(col1.formatType == EXACT_FORMAT){
        for(let i=0; i<sample1.length && chances>0; i++){
            if(parseXF(sample1[i], col1.regex) != parseXF(sample2[i], col2.regex)){
                chances--;
            }
        }
        return chances>0;
    }

    if(col1.formatType == NO_FORMAT){
        for(let i=0; i<sample1.length && chances>0; i++){
            if(sample1[i] != sample2[i]){
                chances--;
            }
        }
        return chances>0;
    }

    if(col1.formatType == NUMERIC){
        for(let i=0; i<sample1.length && chances>0; i++){
            if(parseFloat(sample1[i]) != parseFloat(sample2[i])){
                chances--;
            }
        }
        return chances>0;
    }

    if(Math.floor(col1.formatType) == DATE){
        for(let i=0; i<sample1.length && chances>0; i++){
            if(parseDate(sample1[i], col1.formatType) != parseDate(sample2[i], col2.formatType)){
                chances--;
            }
        }
        return chances>0;
    }

    if(Math.floor(col1.formatType) == TIME){
        for(let i=0; i<sample1.length && chances>0; i++){
            if(parseTime(sample1[i], col1.formatType) != parseTime(sample2[i], col2.formatType)){
                chances--;
            }
        }
        return chances>0;
    }

    return false;
}


/**
 * Parses Date data into a common format
 * @returns a string in the form D(D)M(M)YY based on the predetermined date format
 * In this way, 12/9/24, December 9, 2024, and 09-DEC-2024 are the same, as they are all parsed to "91224"
 */
function parseDate(date,format){
    //return a string
    result = "";
    if(format == DATE){
        let split = date.split(/-|\//);
        if(split.length == 3){
            if(split[0][0] == "0"){
                result += split[0][1];
            }else{
                result += split[0];
            }
            if(/\d/.test(split[1])){
                if(split[1][0] == "0"){
                    result += split[1][1];
                }else{
                    result += split[1];
                }
            }else{
                result += MMM_MAP.get(split[1].toLowerCase());
            }
            if(split[2].length == 2){
                result += split[2]
            }else if(split[2].length == 4){
                result += split[2][2];
                result += split[2][3];
            }
        }
    }else if(format == DATE+0.1){
        let split = date.split(/-|\//);
        if(split.length == 3){
            if(/\d/.test(split[1])){
                if(split[1][0] == "0"){
                    result += split[1][1];
                }else{
                    result += split[1];
                }
            }else{
                result += MMM_MAP.get(split[1].toLowerCase());
            }
            if(split[0][0] == "0"){
                result += split[0][1];
            }else{
                result += split[0];
            }
            if(split[2].length == 2){
                result += split[2]
            }else if(split[2].length == 4){
                result += split[2][2];
                result += split[2][3];
            }
        }
    }else if(format == DATE+0.2){
        let split = date.split(/,? /);
        if(split.length == 3){
            if(split[1][0] == "0"){
                result += split[1][1];
            }else{
                result += split[1];
            }
            result += Month_MAP.get(split[0].toLowerCase());
            result += split[2][2];
            result += split[2][3];
        }
    }
    return result;
}



/**
 * Parses time data into a common format
 * @returns a four digit integer integer in the form of HHMM, for example 1200.
 * In this way, 3:00pm and 15:00 are the same, as they are both parsed to 1500
 */
function parseTime(time,format){
    //return an int
    result = 0;
    if(format == TIME){
        if(!/:/.test(time)){
            time = time.slice(0,2)+":"+time.slice(2,4);
        }
        if(time.indexOf(":") == 2){
            result = parseInt(time[0]+time[1]+time[3]+time[4]);
        }else{
            result = parseInt(time[0]+time[2]+time[3]);
        }
    }else if(format == TIME+0.1){
        if(time.indexOf(":") == 2){
            result = parseInt(time[0]+time[1]+time[3]+time[4]);
        }else{
            result = parseInt(time[0]+time[2]+time[3]);
        }
        if(!/^12/.test(time) && /pm$/i.test(time)){
            result += 1200;
        }
        if(/^12/.test(time) && /am$/i.test(time)){
            result -= 1200;
        }
    }
    return result;
}




/**
 * Parses exact format data into a common format based on regex.
 * @returns a string of the unique values in the exact format. 
 * In this way, 1##0## and 1##-0## are the same, as they are both parsed to "####"
 * 
 */
function parseXF(text, regex){
    //return a string
    result = "";
    for(let i=0; i<text.length; i++){
        if(i<regex.length){
            if(regex[i] == '▄' || regex[i] == '█'){
                result += text[i];
            }
        }else{
            result += text[i];
        }
    }
    return result;
}

/**
 * counts the unique values in an array and reduces them into a frequency list as well
 * @param {*} arr raw column data
 * @param {*} start default 0
 * @param {*} end default array.length
 * @param {boolean} *optional* include the Map of cell values to frequency list index
 */
function countDistinct(arr, start = 0, end = null, includeHS = false){
    if(end == null){
        end = arr.length;
    }
    let hs = new Map();
    let realHs = new Map();
    let freq = []
    for(let i = start; i < end; i++){
        if(hs.has(arr[i])){
            freq[hs.get(arr[i])]++;
        }else{
            hs.set(arr[i], freq.length);
            realHs.set(freq.length, arr[i]);
            freq.push(1);
        }
    }
    arr.freq = freq;
    if(includeHS){
        arr.HS = realHs;
    }
}


/**
 * @returns a modified array with the properties:
 *  commonValue (most frequently occuring value)
 * commonCount (how many times commonValue appears)
 * @param {*} arr 
 */
function findCommonOccurance(arr){
    let max = 0, maxIndex = 0;
    countDistinct(arr,0, arr.length, true);
    let freq = arr.freq;
    for(let k=0; k<freq.length; k++){
        if(freq[k] > max){
            max = freq[k];
            maxIndex = k;
        }
    }
    arr.commonValue = arr.HS.get(maxIndex);
    arr.commonCount = max;
}

/**
 * @param {*} num length of set
 * @param {*} min inclusive
 * @param {*} max inclusive
 * @returns a random set of numbers of length (num) in the inclusive range between (min) and (max)
 *  if randomSample is false, returns the first (num) numbers starting from min
 */
function generateSet(num,min=0,max){
    if(min>max){throw new RangeError("(min) must be greater than or equal to (max)");}
    if(num>(max+1-min)){throw new RangeError("sets contain unique elements, (num) cannot be greater than the inclusive range between (min) and (max)");}
    let pool = Array(max+1-min), m = pool.length, t, i=0, l=num;
    for(let j=min; j<=max; j++){
        pool[i] = j;
        i++;
    }
    if(!randomSample){
        return pool.splice(0,num);
    }
    // While there remain elements to shuffle…
    while (l--) {
        // Pick a remaining element…
        i = Math.floor(Math.random() * m--);
    
        // And swap it with the current element.
        t = pool[m];
        pool[m] = pool[i];
        pool[i] = t;
    }
    return pool.slice(pool.length-num);
}









//*****************************************************************************************************//
//The following lines of code are non-algorithm related. They are functions for UI handling and output.//



//output related functions:

function getRowLink(row, col){
    if(col==-1){
        return "(<a  href=\"javascript:void(0);\" onclick=\"showRow("+row+",-1,0)\">"+row+"</a>)";
    }
    return "(<a  href=\"javascript:void(0);\" onclick=\"showRow("+row+","+col.index+","+col.parentTable+")\">"+row+"</a>)";
}

function logMismatch(col1, col2, r){
    if(!logNull && (col1[r] == "" || col2[r] == "")){return;}
    if(col1[r] == col2[r]){return;}
    function padString(str1, str2, n=0){
        if(str1.length>str2.length){
            str1 += " ".repeat(n);
            str2 += " ".repeat(str1.length-str2.length);
        }else{
            str2 += " ".repeat(n);
            str1 += " ".repeat(str2.length-str1.length);
        }
        return [str1, str2];
    }
    let fileName = padString(tables[col1.parentTable].name, tables[col2.parentTable].name,4);
    let colName = padString(col1[0], col2[0], 4);
    let row = padString(
        absoluteRow(r,col1)+getRowLink(r,col1), 
        absoluteRow(r,col2)+getRowLink(r,col2), 6);
    
    const printOut = 
        "Mismatch: "+fileName[0]+">"+colName[0]+">Row "+row[0]+"\""+col1[r]+"\"\n"+
        "          "+fileName[1]+">"+colName[1]+">Row "+row[1]+"\""+col2[r]+"\"";
    addOutputItem(printOut);
}

function logMatch(cols){
    let colNames = cols[0][0];
    for(let i=1; i<cols.length; i++){
        colNames += ", ";
        colNames += cols[i][0];

    }

    let test = "";
    switch(Math.floor(cols[0].formatType)){
        case 0:
            test = "Exact Match"; break;
        case 1:
            test = "Exact Format - "+cols[0].regex.replaceAll("▄","#"); break;
        case 2:
            test = "Matched Set"; break;
        case 3:
            test = "Numeric"; break;
        case 4:
            test = "Date"; break;
        case 5:
            test = "Time"; break;
        case 6:
            test = "Uniform"; break;
    }
    let printOut = 
        "        Columns: "+colNames+"\n"+
        "        Test: "+test+"                                          ";
    addOutputItem(printOut);
}

function logFormatError(col, r){
    if(col.balanceType == UNIFORM){
        addOutputItem("Inconsistency: "+tables[col.parentTable].name+" >"+col[0]+" >Row "+absoluteRow(r,col)+getRowLink(r,col)+" \""+col[r]+"\"");
    }
    type = Math.floor(col.formatType);
    if(type == EXACT_FORMAT){
        logXFError(col, r);
    }else if(type == DATE || type == TIME){
        logDTError(col, r);
    }else if(type == NUMERIC){
        logNumError(col, r);
    }
}

function logXFError(col, r){
    if(!logNull && col[r] == ""){return;}
    let printOut = 
        "Format Error: "+tables[col.parentTable].name+" >"+col[0]+" >Row "+absoluteRow(r,col)+getRowLink(r,col)+"\n"+
        "             \""+col[r]+"\" does not match "+col.regex.replaceAll("▄","#");
        addOutputItem(printOut);
}

function logDTError(col, r){
    if(!logNull && col[r] == ""){return;}
    let printOut = "Format Error: "+tables[col.parentTable].name+" >"+col[0]+" >Row "+absoluteRow(r,col)+getRowLink(r,col)+"\n";
    if(Math.floor(col.formatType) == 4){
        printOut += "             \""+col[r]+"\" is not a valid date";
    }else if(Math.floor(col.formatType) == 5){
        printOut += "             \""+col[r]+"\" is not a valid time";
    }
    addOutputItem(printOut);
}

function logNumError(col, r){
    let printOut = 
    "Format Error: "+tables[col.parentTable].name+" >"+col[0]+" >Row "+absoluteRow(r,col)+getRowLink(r,col)+"\n"+
    "             \""+col[r]+"\" is not a valid number";
    addOutputItem(printOut);
}

function addOutputItem(printOut){
    let outputList = document.getElementById("output-list");
    let li = document.createElement("li");
    li.addEventListener("click", selectMismatch, false);
    li.innerHTML = printOut;
    outputList.appendChild(li);
}

function absoluteRow(r, col){
    return r+tables[col.parentTable].titleRow+1;
}






//UI related functions:

function selectMismatch(event){
    if(event.target.className == ""){
        event.target.className = "selected";
    }else{
        event.target.className = "";
    }
}



let shownCell;
function showRow(row, column, table){
    handleNavBarClick(table);
    let t = document.getElementById("mainTable");
    let r = t.rows[row]
    let c;
    if(column == -1){
        c = r;
    }else{
        c = r.cells[Math.min(r.cells.length-1,column+1)];
    }

    if(shownCell){
        shownCell.className = "";
    }
    c.className = "blue-highlight";
    shownCell = c;
    // Scroll the row into view
    c.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function updateProgressBar(percent=0,delay=0,message=""){
    if(doDelay){
        await resolveAfter(delay);
    }
    if(message != ""){
        document.getElementById("progress-text").innerHTML = message;
    }
    if(percent>=0){
        let progress = document.getElementById("progress-bar");
        progress.style.width = (percent*798)+"px"; 
    }
}

/**
 * Delay function that resolves after the specified time. 
 * Use in an async function with await
 * @param {number} miliseconds 
 */
function resolveAfter(miliseconds) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('resolved');
      }, miliseconds);
    });
}

// Advanced settings UI handling functions

function openSettings(){
    let menu = document.getElementById("settings-container");
    menu.style.display = "block";
    document.getElementById("dark-toggle").checked = getCookie("isDark") == "true";
    document.getElementById("column-toggle").checked = logUniErrors;
    document.getElementById("null-toggle").checked = logNull;
    document.getElementById("sort-toggle").checked = sortOutput;
    document.getElementById("error-tolerance-input").value = errorTolerance;
    document.getElementById("check-proportion-input").value = checkProportion;
    document.getElementById("MCThreshold-input").value = MCThreshold;
    document.getElementById("MCTolerance-input").value = MCTolerance;
    document.getElementById("rowShiftCheckLength-input").value = rowShiftCheckLength;
}

function saveSettings(){
    setCookie("isDark", document.getElementById("dark-toggle").checked, 365);
    setCookie("isColumn", document.getElementById("column-toggle").checked, 365);
    setCookie("isNull", document.getElementById("null-toggle").checked, 365);
    setCookie("isSort", document.getElementById("sort-toggle").checked, 365);
    updateTheme();
    logUniErrors = getCookie("isColumn") == "true";
    logNull = getCookie("isNull") == "true";
    sortOutput = getCookie("isSort") == "true";



    newET = parseFloat(document.getElementById("error-tolerance-input").value);
    newCP = parseFloat(document.getElementById("check-proportion-input").value);
    newMCThresh = parseFloat(document.getElementById("MCThreshold-input").value);
    newMCTol = parseFloat(document.getElementById("MCTolerance-input").value);
    newRSCL = parseInt(document.getElementById("rowShiftCheckLength-input").value);
    if(newET > 0 && newET < 1){setCookie("errorTolerance",newET,365);}
    if(newCP > 0 && newCP <= 1){setCookie("checkProportion",newCP,365);}
    if(newMCThresh > 0 && newMCThresh < 1){setCookie("MCThreshold",newMCThresh,365);}
    if(newMCTol >= 1 && newMCTol <= 100){setCookie("MCTolerance",newMCTol,365);}
    if(newRSCL >= 1 && newRSCL <= 100){setCookie("rowShiftCheckLength",newRSCL,365);}
    errorTolerance = parseFloat(getCookie("errorTolerance"));
    checkProportion = parseFloat(getCookie("checkProportion"));
    MCThreshold = parseFloat(getCookie("MCThreshold"));
    MCTolerance = parseFloat(getCookie("MCTolerance"));
    rowShiftCheckLength = parseInt(getCookie("rowShiftCheckLength"));


    document.getElementById("settings-container").style.display = "none";
}

function toggleDark(){
    let toggle = document.getElementById("dark-toggle");
    updateTheme(toggle.checked);
}

function cancelSettings(){
    let menu = document.getElementById("settings-container");
    menu.style.display = "none";
    updateTheme();
}

function restoreDefault(){
    destroyCookie("isColumn");
    destroyCookie("isNull");
    destroyCookie("isSort");
    destroyCookie("errorTolerance");
    destroyCookie("checkProportion");
    destroyCookie("MCThreshold");
    destroyCookie("MCTolerance");
    destroyCookie("rowShiftCheckLength");

    initializeVariables();
    setTheme();
    openSettings();
}

function aboutClicked(){
    button = document.getElementById("about-button");
    if(button.innerHTML == "&nbsp;&nbsp;Help&nbsp;&nbsp;"){
        document.getElementById("settings-container").style.width = "490px";
        document.getElementById("help-page").style.display = "block";
        button.innerHTML = "&nbsp;&nbsp;Back&nbsp;&nbsp;";
    }else{
        document.getElementById("settings-container").style.width = "310px";
        document.getElementById("help-page").style.display = "none";
        button.innerHTML = "&nbsp;&nbsp;Help&nbsp;&nbsp;";
    }
}



