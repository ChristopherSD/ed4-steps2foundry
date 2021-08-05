const step2ed = {
    createImportButton() {
        // Do Hooks get called twice?
        // At least it appends the button twice, so check if already exists..
        if (!!document.getElementById("import-button-secondstep")) return;

        console.log("Step2ED | Adding Import Button");

        // find the create-entity buttons and insert our import button after them
        let createButtons =  $("section#actors div.header-actions.action-buttons.flexrow");

        const importButton = $(
            `<div class="header-import action-buttons flexrow"><button type="button" id="import-button-secondstep"><i class="fas fa-download "></i>${game.i18n.localize("CONTEXT.ImportSecStep")}</button></div>`
        );

        createButtons[0].insertAdjacentHTML('afterend', importButton[0].outerHTML);

        // create a file picker and bind it to the new button
        document.getElementById("import-button-secondstep").addEventListener("click", function() {
            new JSONPicker({
                callback: file => step2ed.importJSON(file)
            }).browse();
        });
    },

    _createFromJSON(sstep) {
        if (!sstep.hasOwnProperty("StepsVersion")) {
            ui.notifications.error(game.i18n.localize("ERROR.InvalidSecStepFile"));
            return;
        }

        let updateData = {
            "biography": sstep.Basic.Description,
            "race": "",
            "height": sstep.Basic.Height,
            "sex": sstep.Basic.Gender,
            "weight": sstep.Basic.Weight,
            "age": sstep.Basic.Age,
            "hair": sstep.Basic.Hair,
            "eyes": sstep.Basic.Eyes,
            "skin": sstep.Basic.Skin,
            "movement": "",
            "attributes": {
                "dexterityvalue": 10,
                "strengthvalue": 10,
                "toughnessvalue": 10,
                "perceptionvalue": 10,
                "willpowervalue": 10,
                "charismavalue": 10,
                "dexterityinitial": 0,
                "strengthinitial": 0,
                "toughnessinitial": 0,
                "perceptioninitial": 0,
                "willpowerinitial": 0,
                "charismainitial": 0
            },
            "overrides":{
                "physicaldefense": 0,
                "mysticdefense": 0,
                "socialdefense": 0,
                "unconsciousrating": 0,
                "deathrating": 0,
                "physicalarmor": 0,
                "mysticarmor": 0,
                "movement": 0,
                "recoverytestsrefresh": 0,
                "recoverytestscurrent": 0,
                "bloodMagicDamage": 0,
                "bloodMagicWounds":0
            },
            "tactics":{
                "aggressive": false,
                "defensive": false,
                "knockeddown": false,
                "harried": false
            },
            "damage":{
                "value": 0,
                "min": 0,
                "max": 0
            },
            "unconscious":{
                "min": 0
            },
            "wounds": "",
            "recoverytestscurrent": 0,
            "karma":{
                "value": 0,
                "min": 0
            },
            "karmaDie": "d6",
            "legendpointtotal": 0,
            "legendpointcurrent": 0,
            "unspentattributepoints": 0,
            "usekarma": "false",
            "money":{
                "gold": 0,
                "silver": 0,
                "copper": 0
            }
        }

        Actor.create({
            name: sstep.Basic.Name,
            type: "pc"
        }).then(actor => actor.update({data: updateData}), reason => game.notifications.error(reason));

        // TODO: create a JournalEntry where the sstep.Basic.LogText comes in
    },

    importJSON(filepath) {
        console.log("Loading JSON file:\t" + filepath);
        secondStep = $.getJSON(filepath, data => this._createFromJSON(data));
    }
}

class JSONPicker extends FilePicker {
    constructor(options = {}) {
        super(options);
        this.extensions = ['.json', '.JSON']
    }
}

Hooks.on("init", function () {
    console.log("###############\n\nSecond Step Import for ED4:\n\tWe're on!\n\n###############");

    /*game.settings.register('ED4_Steps2Foundry', 'Import File', {
        name: 'Import a SecondStep JSON file',
        hint: 'Import it',
        scope: 'client',
        config: true,
        type: String,
        filePicker: 'file'
    })
    */
})

Hooks.on("ready", function () {
    step2ed.createImportButton()
})

Hooks.on("changeSidebarTab", function () {
    step2ed.createImportButton()
})

Hooks.on("renderSidebarTab", function () {
    step2ed.createImportButton()
})


