class JSONPicker extends FilePicker {
    constructor(options = {}) {
        super(options);
        this.extensions = ['.json', '.JSON']
    }
}

step2ed = {
    importJSON(filepath) {
        console.log("This is the JSON filepath: " + filepath);
    }
}

Hooks.on("init", function () {
    console.log("###############\n\nSecond Step Import for ED4:\n\tWe're on!\n\n###############");

    game.settings.register('ED4_Steps2Foundry', 'Import File', {
        name: 'Import a SecondStep JSON file',
        hint: 'Import it',
        scope: 'client',
        config: true,
        type: String,
        filePicker: 'file'
    })
})

Hooks.once("ready", function () {
    console.log("Step2ED | Adding Import Button");

    // Hook gets called twice?
    // At least it appends the button twice, so check if already exists..
    if (!!document.getElementById("import-button-secondstep")) return;

    // find the create-entity buttons and insert our import button after them
    let createButtons =  $("section#actors div.header-actions.action-buttons.flexrow");

    const importButton = $(
        `<div class="header-import action-buttons flexrow"><button type="button" id="import-button-secondstep"><i class="fas fa-download "></i>${game.i18n.localize("CONTEXT.ImportSecStep")}</button></div>`
    );

    createButtons[0].insertAdjacentHTML('afterend', importButton[0].outerHTML);

    // create a file picker and bind it to the new button
    const fp = new JSONPicker({
        callback: file => step2ed.importJSON(file)
    })

    $("#import-button-secondstep").click(fp.browse());
})

