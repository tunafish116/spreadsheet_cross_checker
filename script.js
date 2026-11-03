//*************UI stuff*****************//

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
}

function hasCookie(cname) {
    // Get all cookies as a single string
    let cookies = document.cookie;
    
    // Check if the cookie name exists within the cookies string
    return cookies.split(';').some(cookie => {
        // Remove leading spaces and check if the cookie starts with the given name
        return cookie.trim().startsWith(cname + "=");
    });
}

function destroyCookie(cookieName) {
    // Set the cookie with the same name and path, and an expired date
    document.cookie = cookieName + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

function setTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setCookie("isDark","true",365);
    } else {
        setCookie("isDark","false",365);
    }
    updateTheme();
}

function updateTheme(dark=null){
    const themeStyle = document.getElementById('theme-style');
    if(dark!=null){
        if(dark){
            themeStyle.href = 'dark.css';
        }else{
            themeStyle.href = 'light.css';
        }
        return;
    }
    if(getCookie("isDark") == "true"){
        themeStyle.href = 'dark.css';
    }else{
        themeStyle.href = 'light.css';
    }
}
if(hasCookie("isDark")){
    updateTheme();
}else{
    setTheme();
}
// Set theme on initial load


// Listen for changes in the user's color scheme preference
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setTheme);














//*****************************************************//
//File importing, sorting, filtering, downloading selection

var tables = [];
var currentTable = null;
var fileNavBar = document.getElementById("fileNavBar");
document.getElementById('fileInput').addEventListener('change', handleFiles, false);

function handleFiles(event){
    for(let file of event.target.files){
        handleFile(file);
    }
}
function handleFile(file) {
    if (!file) {
        return;
    }
    for(let i=0; i<tables.length; i++){
        if(tables[i].name == file.name){
            currentTable = tables[i];
            deleteCurrentFile();
        }
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, {type: 'array', dense: true});
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        function sheetToJsonExcludingHiddenRows(worksheet, options = {}) {
            const { header, raw, range } = options;
            const rows = XLSX.utils.sheet_to_json(worksheet, { header, raw, range });
        
            if (!worksheet['!rows']) {
                // If the worksheet does not have the !rows property, all rows are considered visible
                return rows;
            }
        
            // Exclude rows marked as hidden
            const visibleRows = rows.filter((_, index) => {
                const rowInfo = worksheet['!rows'][index];
                return !(rowInfo && rowInfo.hidden);
            });
        
            return visibleRows;
        }
        const json = XLSX.utils.sheet_to_json(worksheet, {header: 1, raw: false, });
        // `json` is the 2D array containing the spreadsheet data
        tables[tables.length] = json;
        tables[tables.length-1].name = file.name;
        addListItem(tables[tables.length-1]);

        function addListItem(table){
            const item = document.createElement("li");
            item.innerHTML = table.name;
            item.index = tables.indexOf(table);
            item.addEventListener("click", handleNavBarClick, false);
            fileNavBar.appendChild(item);
            for(let i=0; i<fileNavBar.children.length; i++){
                fileNavBar.children[i].className = "";
            }
            fileNavBar.children[tables.length-1].className = "active";
        }
        createTableWithJSON(json);
        
        
    };
    reader.readAsArrayBuffer(file);
}

function handleNavBarClick(event){
    for(let i=0; i<fileNavBar.children.length; i++){
        fileNavBar.children[i].className = "";
    }
    currentTable = tables[event.target.index];
    fileNavBar.children[event.target.index].className = "active";
    updateTable();
    updateSelectors(currentTable[currentTable.titleRow]);
}

/**
 * 
 * @param {*} event event from click OR table index
 */
function handleNavBarClick(event){
    for(let i=0; i<fileNavBar.children.length; i++){
        fileNavBar.children[i].className = "";
    }
    if(Number.isInteger(event)){
        currentTable = tables[event];
        fileNavBar.children[event].className = "active";
    }else{
        currentTable = tables[event.target.index];
        fileNavBar.children[event.target.index].className = "active";
    }
    updateTable();
    updateSelectors(currentTable[currentTable.titleRow]);
}

/**
 * @deprecated unfinished as well
 * @returns a 2D array of strings representing the cells in the worksheet
 * @param {*} worksheet a sheetJS worksheet parsed in dense mode
 */
function sheetToJson(worksheet){
    const ws = worksheet["!data"];
    let result = [ws.length];
    for(let i=0; i<ws.length; i++){
        if(ws[i] == null){
            result[i] = [];
            continue;
        }
        result[i] = [ws[i].length];
        for(let j=0; j<ws[i].length; j++){
            if(ws[i][j] == null){
                
            }else if(ws[i][j].t == 's'){
                result[i][j] = ws[i][j].w;
            }else if(ws[i][j].t == 'n'){
                if(/([1-9]|1[0-2]):[0-6][0-9]/.test(ws[i][j].w)){
                    if(ws[i][j].v >=0.5){
                        result[i][j] = ws[i][j].w+" pm";  
                    }else{
                        result[i][j] = ws[i][j].w+" am";
                    }
                }else if(false){

                }
            }
        }
    }
}

function createTableWithJSON(json){

    //generate table header
    const last_row = findLastRow();
    function findLastRow(){
        let i=json.length-1;
        let maxCol = 0;
        let maxIndex = i;
        while(i>json.length*0.5){
            if(json[i].length>maxCol){maxCol=json[i].length; maxIndex=i;}
            i--;
        }
        i=json.length-1;
        
        // define last row as first row from the end where >75% of columns are not empty
        maxCol *= 0.5;
        let count = 0;
        let lastRow=i;
        while (i>json.length*0.75) {
            count = 0;
            for(let j=0; j<json[i].length; j++){
                if(!isBlank(json[i][j])){
                    count++;
                }
            }
            if(count>maxCol){
                lastRow = i;
                break;
            }
            i--;
        }
        return lastRow;
    }
    for(let i=json.length; i>last_row+1; i--){
        json.pop();
    }
    
    const headers = findHeaders();
    function findHeaders(){
        let i=0;
        let maxCol = 0;
        let maxIndex = 0;
        while(i<30 && i<json.length){
            if(json[i].length>maxCol){maxCol=json[i].length; maxIndex=i;}
            i++;
        }
        i=0;
        
        // define title as first row where >75% of columns are not empty
        maxCol *= 0.75;
        let count = 0;
        let titleRow=0;
        while (i<30 && i<json.length) {
            count = 0;
            for(let j=0; j<json[i].length; j++){
                if(!isBlank(json[i][j])){
                    count++;
                }
            }
            if(count>maxCol){
                titleRow = i;
                break;
            }
            i++;
        }
        const maxColInt = json[maxIndex].length;
        tables[tables.length-1].lastColInt = maxColInt;
        tables[tables.length-1].maxIndex = maxIndex;
        tables[tables.length-1].titleRow = titleRow;
        return json[titleRow];
    }


    currentTable = tables[tables.length-1];
    populateTable(headers, json.slice(json.titleRow+1,json.length));
    updateSelectors(headers);
    let order = document.createElement("select");
    
    order.id = "selectOrder";

    $("#selectOrder").replaceWith(order);

    let option = document.createElement("option");
    option.text = "Ascending";
    order.appendChild(option);
    let option2 = document.createElement("option");
    option2.text = "Descending";
    order.appendChild(option2);

    const navBar = document.getElementById("fileNavBar");
    navBar.children[navBar.childElementCount-1].title = (currentTable.length-currentTable.titleRow)+" rows, "+
        (currentTable[currentTable.titleRow].length)+" columns";
    
}

function populateTable(headers,data){

    let table = document.createElement('table');
    table.id = "mainTable";
    $("#mainTable").replaceWith(table);

    generateHeader(table, headers);
    table.tBody = table.createTBody();

    while(table.rows.length > 1){
        table.deleteRow(table.rows.length-1);
    }
    for(let i=0; i<data.length; i++){
        let newRow = table.tBody.insertRow();
        for(let j=0; j<data[i].length; j++){
            if(data[i][j]==null){
                newRow.insertCell(j).innerHTML = "";
            }else{
                newRow.insertCell(j).innerHTML = data[i][j];
            }
        }
        newRow.insertCell(0).innerHTML = i+1;
    }
}

function generateHeader(HTMLtable, headers){
    let thead = HTMLtable.createTHead();
    let headerRow = thead.insertRow();

    headerRow.appendChild(document.createElement("th"));

    if(!currentTable.colMetaData){
        currentTable.colMetaData = [currentTable.maxColInt].fill(false);
    }
    for (let i=0; i<headers.length; i++){
        let headerCell = document.createElement("th");
        headerCell.addEventListener("click", selectIgnore);
        headerCell.textContent = headers[i];
        headerCell.index = i;
        if(currentTable.colMetaData[i]){
            headerCell.className = "ignore";
        }
        headerRow.appendChild(headerCell);
    };
}

function selectIgnore(event){
    if(event.target.className == ""){
        event.target.className = "ignore";
        currentTable.colMetaData[event.target.index] = true;
    }else{
        event.target.className = "";
        currentTable.colMetaData[event.target.index] = false;
    }
}

function isBlank(str) {
    return !str || /^\s*$/.test(str);
}

function updateSelectors(headers){
    let filter = document.createElement("select");
    let sort = document.createElement("select");

    filter.id = "selectFilter";
    sort.id = "selectSort";

    filter.addEventListener("change", updateTable, false);
    sort.addEventListener("change", updateTable, false);

    $("#selectFilter").replaceWith(filter);
    $("#selectSort").replaceWith(sort);

    headers.unshift("None");
    

    for(let i=0; i<headers.length; i++){
        let option = document.createElement("option");
        option.text = headers[i];
        let option2 = document.createElement("option");
        option2.text = headers[i];
        filter.add(option);
        sort.add(option2);
    }
    headers.shift();
}

function updateTable(){

    populateTable(currentTable[currentTable.titleRow], applyFilters());
}

function applyFilters(){
    let selected = currentTable.slice(currentTable.titleRow+1,currentTable.length);

    const keyWord = document.getElementById("searchBar").value;
    const sort = document.getElementById("selectSort");
    const filter = document.getElementById("selectFilter");
    const order = document.getElementById("selectOrder");

    
    const includesCaseInsensitive = (str, searchString) =>
        new RegExp(searchString, 'i').test(str);

    if(filter.selectedIndex == 0){
        for(let i=selected.length-1; i>=0; i--){
            let splice = true;
            for(let j=0; j<6; j++){
                if(includesCaseInsensitive(selected[i][j], keyWord)){
                    splice = false;
                    break;
                }
            }
            if(splice){
                selected.splice(i,1);
            }
        }
    }else{
        for(let i=selected.length-1; i>=0; i--){
            if(!includesCaseInsensitive(selected[i][filter.selectedIndex-1], keyWord)){
                selected.splice(i,1);
            }
        }
    }

    if(sort.selectedIndex != 0){
        for(let i=0; i<selected.length; i++){
            selected[i].sort = selected[i][sort.selectedIndex-1];
        }
        selected.sort((a,b) => a.sort.localeCompare(b.sort));
        if(order.selectedIndex == 1){
            selected.reverse();
        }
    }

    return selected;

}

function deleteCurrentFile(){
    if(currentTable==null){
        return;
    }
    
    let index = tables.indexOf(currentTable);
    document.getElementById("fileInput").value = "";
    
    tables.splice(index, 1);
    fileNavBar.removeChild(fileNavBar.children[index]);
    if(index>=tables.length){
        index = tables.length-1;
    }else{
        for(let i=index; i<tables.length; i++){
            fileNavBar.children[i].index--;
        }
    }
    currentTable = tables[index];
    if(currentTable == null){
        let table = document.createElement('table');
        table.id = "mainTable";
        $("#mainTable").replaceWith(table);

        let filter = document.createElement("select");
        let sort = document.createElement("select");
    
        filter.id = "selectFilter";
        sort.id = "selectSort";
    
        $("#selectFilter").replaceWith(filter);
        $("#selectSort").replaceWith(sort);

    }else{
        fileNavBar.children[index].className = "active";
        updateTable();
        updateSelectors(currentTable[currentTable.titleRow]);
    }
}


function downloadExcel(){
    let data = applyFilters();
    for(plant of data){
        delete plant.sort;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.sheet_add_aoa(worksheet, [currentTable[currentTable.titleRow]], { origin: "A1" });

    XLSX.utils.book_append_sheet(workbook, worksheet, "selection");
    XLSX.writeFile(workbook, currentTable.name.split(".")[0]+"_"+document.getElementById("searchBar").value+"_selection"+".xlsx", { compression: false });

    // const blob = new Blob([workbook], { type: 'text/plain' });
    // const url = window.URL.createObjectURL(blob);
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = currentTable.name+"_selection.xlsx"; //name of file to download
    // document.body.appendChild(a); //necessary on some browsers to make it clickable
    // a.click();
    // document.body.removeChild(a); //keep DOM structure clean
    // window.URL.revokeObjectURL(url); //free up memory
}




window.addEventListener('beforeunload', function (e) {
    // Cancel the event
    e.preventDefault(); 
});



let titleIndex = 0;
const titles = [
`<div class="ticker-container">
    <div class="ticker">
        <div class="ticker-item"><h1 style="margin-top: 0px;">Accurant Sample Manager</h1></div>
        <div class="ticker-item"><h1 style="margin-top: 0px;">Accurant Sample Manager</h1></div>
        <div class="ticker-item"><h1 style="margin-top: 0px;">Accurant Sample Manager</h1></div>
    </div>
</div>`,

`<div class="image-container">
    <img src="lights1.png" alt="Image 1" class="image img1">
    <img src="lights2.png" alt="Image 2" class="image img2">
</div>`,

`<div id="STH-container">
    <img id="STH-gif" src="sonic-full_speed_run.gif"></img>
</div>
<div id="stripe-container">
    <div class="speed-stripe" style="top: 52px"></div>
    <div class="speed-stripe" style="top: 60px"></div>
    <div class="speed-stripe" style="top: 68px"></div>
    <div class="speed-stripe" style="top: 76px"></div>
    <div class="speed-stripe" style="top: 84px"></div>
    <div class="speed-stripe" style="top: 92px"></div>
    <div class="speed-stripe" style="top: 100px"></div>
</div>
<h1 style="margin-top: 0px;">Accurant Sample Manager</h1>
<div class="left-stripe" style="top: 52px"></div>
<div class="right-stripe" style="top: 56px"></div>
<div class="left-stripe" style="top: 60px"></div>
<div class="right-stripe" style="top: 64px"></div>
<div class="left-stripe" style="top: 68px"></div>
<div class="right-stripe" style="top: 72px"></div>
<div class="left-stripe" style="top: 76px"></div>
<div class="right-stripe" style="top: 80px"></div>
<div class="left-stripe" style="top: 84px"></div>
<div class="right-stripe" style="top: 88px"></div>
<div class="left-stripe" style="top: 92px"></div>
<div class="right-stripe" style="top: 96px"></div>
<div class="left-stripe" style="top: 100px"></div>`,

`<h1 style="margin-top: 0px;">Accurant Sample Manager</h1>`];

function changeTitleStyle(){

    let replacement = document.createElement("div");
    replacement.id = "main-title";
    replacement.ondblclick = function(){changeTitleStyle();}
    replacement.innerHTML = titles[titleIndex];
    $("#main-title").replaceWith(replacement);
    titleIndex++;
    if(titleIndex>=titles.length){
        titleIndex=0;
    }

}

let enigmaIndex = 0;
let enigmaCode = "TOPSECRET";
addEventListener("keydown",enigma);

function enigma(e){
    if(e.code == "Key"+enigmaCode[enigmaIndex]){
        enigmaIndex++;
    }else if(enigmaIndex!=0){
        enigma(e);
    }else{
        enigmaIndex = 0;
    }
    if(enigmaIndex == enigmaCode.length){
        document.getElementById("main-title").addEventListener("dblclick", changeTitleStyle);
        return;
    }
}