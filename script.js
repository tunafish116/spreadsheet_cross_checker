var tables = [];
var currentTable = null;
var fileNavBar = document.getElementById("fileNavBar");
document.getElementById('fileInput').addEventListener('change', handleFile, false);


function handleFile(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    for(let i=0; i<tables.length; i++){
        if(tables[i].name == file.name){
            return;
        }
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, {type: 'array', dense: true});
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
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
    option.text = "ascending";
    order.appendChild(option);
    let option2 = document.createElement("option");
    option2.text = "descending";
    order.appendChild(option2);

    
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

    for (let i=0; i<headers.length; i++){
        let headerCell = document.createElement("th");
        headerCell.textContent = headers[i];
        headerRow.appendChild(headerCell);
    };
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

