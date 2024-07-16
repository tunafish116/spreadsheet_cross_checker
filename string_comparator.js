        //return an int
        //use an integer to influence how sure the program is
        // if the results are too close then ask for verification.

//make helper methods to make comparison easier

//types

//requisition number
    //title contains requisition +10, number +3
    //ten digits +5
    //starts with C +5
    //both +5
    //not/mostly consistent -20/-10
//ACM unique ID
        //title contains ACM +5, number +3
        //starts with AA +8
        //7 digits +5
        // both +5
        //not/mostly consistent -20/-10
//Participant ID
        //title contains participant, subject, subj +3
        //title contains ID +2
        //both +3
        //6 digits +4


//other
    // rely on general format
    // digits, length, consistency, recurring characters
    // then cross check to seal the deal.
    // compare columns with the same general characteristics
    // multiplicative relevance. 1-2 for each factor, multiple factors will make match exponetially stronger


//TODO figure out file cross reference system.
//when given multiple files, if the algo thinks these two are the columns 
//and the cross reference shows they are the same, +10 or something.



//for testing, insert errors into files of different formats and expect all discrepancies to be flagged.
//everything must be parsed into a very nice format with titles and cells easily accesible
// if date detected must rely on title and date cross checks.

//detect unique words
//cross-reference files
//consistency factor
//convert then check date
//
const checkProportion = 0.2; //default 0.2
const errorTolerance = 0.05; //default 0.05

const UNIFORM = 2, BALANCED = 0, UNBALANCED = 1,
    NO_FORMAT = 0, EXACT_FORMAT = 1, MULTIPLE_CHOICE = 2, NUMERIC = 3, DATE = 4; TIME = 5;

const numericRegex = /^[0-9]*(\.)?[0-9]*$/;
const dateRegex_DMY = /^(?:(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](\d{2}|\d{4})|([0-2]?[0-9]|3[01])-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-(\d{2}|\d{4}))$/i;
const dateRegex_MDY = /^(?:(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](\d{2}|\d{4})|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-([0-2]?[0-9]|3[01])-(\d{2}|\d{4}))$/i;
const dateRegex_literal = /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, \d{4}$/i;
const timeRegex_military = /^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]/;
const timeRegex_normal = /^(0?[1-9]|1[0-2]):[0-5][0-9] ?(p|a)m/;

const MMM_MAP = new Map([["jan",1],["feb",2],["mar",3],["apr",4],["may",5],["jun",6],["jul",7],["aug",8],["sep",9],["oct",10],["nov",11],["dec",12],]);
const Month_MAP = new Map([["january",1],["february",2],["march",3],["april",4],["may",5],["june",6],["july",7],["august",8],["september",9],["october",10],["november",11],["december",12],]);

/**
 * 
 * @requires tables - Global array of 2D json arrays representing collection of raw data
 * 
 * Limitations:
 * minimum length bottlenecked by certain checks. recommended minimum 50 rows of data
 * may, in certain cases mark correct data as mismatched due to extraneous column matching
 */
function RUN_AUTO_CROSSCHECK(){
    if(tables.length == 0){
        window.alert("No files to cross check!");
        return;
    }
    if(!window.confirm(
        "Warning: this will begin cross checking all uploaded files. If there are any files with unrelated "+
        "info or do not need to be cross checked, please reload the page and restart."+
        "\n\nAre you sure you want to continue?")){
        return;
    }
    let sheets = [];
    for(let i=0; i<tables.length; i++){
        sheets[i] = new Array(tables[i][tables[i].titleRow].length);
        for(let j=0; j<sheets[i].length; j++){
            sheets[i][j] = new Array(tables[i].length-tables[i].titleRow);
            sheets[i][j].parentTable = i;
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


    for(let i=0; i<sheets.length; i++){
        for(let j=0;j<sheets[i].length; j++){
            //sheets[i][j] is an entire column
            // run consistency check
            //run format check
            // check for numeric
            // check for date
            // run uniqueness check and attach properties to the column
            const column = sheets[i][j];

            countDistinct(column,1);
            column.maxFreq = column.freq.reduce((a, b) => Math.max(a, b), -Infinity);
            if(column.maxFreq>(column.length-1)*(1-errorTolerance*0.5)){
                column.balanceType = UNIFORM;
            }else if(column.maxFreq>(column.length-1)*(1-errorTolerance*6)){
                column.balanceType = UNBALANCED;
            }else{
                column.balanceType = BALANCED;
            }

            if(column.balanceType <= UNBALANCED){
                if(column.freq.length < column.length*0.07 || column.freq.length < 10){
                    column.formatType = MULTIPLE_CHOICE;
                }else{
                    //run exact format check
                    if(column.balanceType == UNBALANCED){
                        column.formatType = NO_FORMAT;
                    }else{
                        //generate format
                        let randSample = getRandomIndexSample(column);
                        let checkLength = randSample.length;
                        let arr = Array(checkLength);
                        for(let k=0; k<checkLength; k++){
                            arr[k] = column[randSample[k]].length;
                        }
                        findCommonOccurance(arr);
                        if(arr.commonCount>(checkLength-1)*(1-errorTolerance*2)){
                            const length = arr.commonValue;
                            
                            //if over 90% of the checked portion has the same length
                            //do specific format algorithm
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
                                //this will check for exact match
                                findCommonOccurance(arr);
                                if(arr.commonCount>(checkLength-1)*(1-errorTolerance)){
                                    if(arr.commonValue == "."){
                                        arr.commonValue = "\.";
                                    }
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
                                        format += "\d";
                                    }else{
                                        format += ".";
                                    }
                                }
                            }
                            column.regex = format;

                            column.formatType = EXACT_FORMAT;


                        }else{
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
                                    column.formatType = TIME + (maxIndex-2)*0.1;
                                }
                                continue;
                            }
                            //do numeric check
                            let count = 0;
                            for(let k=0; k<checkLength; k++){
                                if(numericRegex.test(column[randSample[k]])){
                                    count++;
                                }
                            }
                            if(count>checkLength*(1-errorTolerance)){
                                column.formatType = NUMERIC;
                            }else{
                                column.formatType = NO_FORMAT;
                            }
                        }
                    }
                }
            }
        }
    }
    //use a stack that is pushed and popped with columns until not much is changing, then stop
    console.log(sheets);
    //there are multiple ways of matching columns
    //if both unbalanced run check with 2x sample and 2x consistency requirement
    //if both multiple choice run multiple choice match
    //if both exact format run format check (unique values compared 1 to 1)
    //if both uniform check frequency list: list.length == 1 don't bother (unmatchable)
        //find some special way to compare these columns (must use verbatim match)
    //if both date use date convert 
    //if both time use time convert
    //if both numeric match verbatim

    //use chances for each to limit computation


    //assign columns to groups accoring to type
    let allGroups = Array(7);
    for(let i=0; i<7; i++){
        allGroups[i] = Array();
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
	
    //array of column matches. matches stored as array of columns
    let matches = [];

    for(let i=0; i<allGroups.length; i++){
        let hasMatch = true;
        let match = [];
        let group = allGroups[i];
        while(group.length > 1){
            hasMatch = false;
            match = [group[0]];
            for(let j=1; j<group.length; j++){
                if(isMatchCol(group[0], group[j])){
                    hasMatch = true;
                    match.push(group[j]);
                    group.splice(j,1);
                    j--;
                }
            }
            if(hasMatch){
                matches.push(match);
            }
            group.shift();
        }
    }

    console.log(matches);

    //Cross checking happens here
    for(let i=0; i<matches.length; i++){
        for(let j=0; j<matches[i].length-1; j++){
            const col1 = matches[i][j];
            const col2 = matches[i][j+1];
            const minLength = Math.min(col1.length, col2.length);

            if(col1.formatType == MULTIPLE_CHOICE){
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

                // console.log("start");
                // let newMap = new Map();
                // for(let pair of choiceMap){
                //     newMap.set(pair[0],freq[pair[1]]);
                // }
                // console.log(newMap);
        
                let map1 = new Map(), map2 = new Map();
                const keys = choiceMap.keys();
        
                for(let k=0; k<freq.length; k++){
                    let split = keys.next().value.split(";",2);
                    if(map1.has(split[0]) || map2.has(split[1])){
                        let index = 0;
                        if(map1.has(split[0])){
                            index = map1.get(split[0]);
                        }else{
                            index = map2.get(split[1]);
                        }
                        if(freq[k] >= 4*freq[index]){
                            freq[index] = 0;
                            map1.set(split[0],k);
                            map2.set(split[1],k);
                        }else if(freq[index] >= 4*freq[k]){
                            freq[k] = 0;
                        }
                    }else{
                        map1.set(split[0],k);
                        map2.set(split[1],k);
                    }
                }
                // newMap = new Map();
                // for(let pair of choiceMap){
                //     newMap.set(pair[0],freq[pair[1]]);
                // }
                // console.log(newMap);

                for(let k=1; k<minLength; k++){
                    let key = col1[k]+";"+col2[k];
                    if(freq[choiceMap.get(key)] == 0){
                        logMismatch(col1,col2,k);
                    }
                }
        
            }

            if(col1.formatType == EXACT_FORMAT){
                for(let k=1; k<minLength; k++){
                    if(parseXF(col1[k], col1.regex) != parseXF(col2[k], col2.regex)){
                        logMismatch(col1,col2,k);
                    }
                }
            }

            if(col1.formatType == NO_FORMAT){
                for(let k=1; k<minLength; k++){
                    if(col1[k] != col2[k]){
                        logMismatch(col1,col2,k);
                    }
                }
            }

            if(col1.formatType == NUMERIC){
                for(let k=1; k<minLength; k++){
                    if(parseFloat(col1[k]) != parseFloat(col2[k])){
                        logMismatch(col1,col2,k);
                    }
                }
            }

            if(col1.formatType == DATE){
                for(let k=1; k<minLength; k++){
                    if(parseDate(col1[k], col1.formatType) != parseDate(col2[k], col2.formatType)){
                        logMismatch(col1,col2,k);
                    }
                }
            }

            if(col1.formatType == TIME){
                for(let k=1; k<minLength; k++){
                    if(parseTime(col1[k], col1.formatType) != parseTime(col2[k], col2.formatType)){
                        logMismatch(col1,col2,k);
                    }
                }
            }

        }
    }

}

function getRandomIndexSample(column, percent=checkProportion){
    if(percent>1){percent = 1;}
    let checkLength = Math.floor(Math.max(Math.min(100, column.length-2),(column.length-2)*percent));
    let randSample = generateSet(checkLength, 1,column.length-1);
    return randSample;
}

function logMismatch(col1, col2, r){
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
    let row = padString((r+tables[col1.parentTable].titleRow).toString(), (r+tables[col2.parentTable].titleRow).toString(), 6);
    
    console.log("Mismatch: "+fileName[0]+">"+colName[0]+">Row "+row[0]+"\""+col1[r]+"\"\n"+
                "          "+fileName[1]+">"+colName[1]+">Row "+row[1]+"\""+col2[r]+"\"");
}


function isMatchCol(col1, col2){
    //blank titles rejected
    if(col1[0] == "" || col2[0] == ""){
        return false;
    }
    if(col1.balanceType != col2.balanceType){
        return false;	
    }
    if(col1.balanceType == UNIFORM){
        //special verbatim check
        //TODO implement later
        return false;
    }

    if(Math.floor(col1.formatType) != Math.floor(col2.formatType)){
        return false;
    }

    let chances, randIndex;

    let minCol = col1.length<col2.length? col1:col2;

    if(col1.balanceType == BALANCED){
        randIndex = getRandomIndexSample(minCol);
        chances = randIndex.length*errorTolerance*2;
    }else{
        randIndex = getRandomIndexSample(minCol, checkProportion*2);
        chances = randIndex.length*errorTolerance;
    }
    
    let sample1 = [], sample2 = [];
    for(let i=0; i<randIndex.length; i++){
        sample1[i] = col1[randIndex[i]];
        sample2[i] = col2[randIndex[i]];
    }

	if(col1.formatType == MULTIPLE_CHOICE){
		let choiceMap = new Map();
        let set1 = new Set(), set2 = new Set();   
        //freq currently unused     
		let freq = [];
		for(let i=0; i<sample1.length; i++){
            let key = sample1[i]+";"+sample2[i];
			if(choiceMap.has(key)){
                freq[choiceMap.get(key)]++;
            }else{
                if(set1.has(sample1[i]) || set2.has(sample2[i])){
                    chances--;
                }else{
                    choiceMap.set(key, freq.length);
                    set1.add(sample1[i]);
                    set2.add(sample2[i]);
                    freq[freq.length] = 1;
                }
            }
		}

        return chances>0;
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

function parseDate(date,format){
    //return a string
    result = "";
    if(format == DATE){
        let split = date.split(/-|\//);
        if(split.length == 3){
            result += split[0];
            if(/\d/.test(split[1])){
                result += split[1];
            }else{
                result += MMM_MAP.get(split[1]);
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
                result += split[1];
            }else{
                result += MMM_MAP.get(split[1].toLowerCase());
            }
            result += split[0];
            if(split[2].length == 2){
                result += split[2]
            }else if(split[2].length == 4){
                result += split[2][2];
                result += split[2][3];
            }
        }
    }else if(format == DATE+0.2){
        let split = date.split(/,| /);
        if(split.length == 3){
            result += Month_MAP.get(split[0].toLowerCase());
            result += split[1];
            result += split[2][2];
            result += split[2][3];
        }
    }
    return result;
}

function parseTime(time,format){
    //return an int
    result = 0;
    if(format == TIME){
        result = parseInt(time[0]+time[1]+time[3]+time[4]);
    }else if(format == TIME+0.1){
        result = parseInt(time[0]+time[1]+time[3]+time[4]);
        if(/pm$/i.test(time)){
            result += 1200;
            if(result>=2400){
                result -= 2400;
            }
        }
    }
    return result;
}

function parseXF(text, regex){
    //return a string
    result = "";
    for(let i=0; i<regex.length; i++){
        if(regex[i] == '\d' || regex[i] == '\.'){
            result += text[i];
        }
    }
    return result;
}

/**
 * 
 * @param {*} arr raw column data
 * @param {*} start default 0
 * @param {*} end default array.length
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
 * 
 */
function generateSet(num,min=0,max){
    if(min>max){throw new RangeError("(min) must be greater than or equal to (max)");}
    if(num>(max+1-min)){throw new RangeError("sets contain unique elements, (num) cannot be greater than the inclusive range between (min) and (max)");}
    let pool = Array(max+1-min), m = pool.length, t, i=0, l=num;
    for(let j=min; j<=max; j++){
        pool[i] = j;
        i++;
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



