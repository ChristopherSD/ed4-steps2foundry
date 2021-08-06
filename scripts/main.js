const step2ed = {
    createImportButton: function() {
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

    _createFromJSON: async function(sstep) {
        if (!sstep.hasOwnProperty("StepsVersion")) {
            ui.notifications.error(game.i18n.localize("ERROR.InvalidSecStepFile"));
            return;
        }

        try {
            console.log("Step2ED | Creating new Actor");

            let actor = await Actor.create({
                name: sstep.Basic.Name,
                type: "pc",
                image: sstep.PortraitURL
            });

            console.log("Step2ED | Creating base attributes");

            // open the notes and legend tab of the character sheet to go to character creation
            // this is necessary since secondStep Jsons only have the start values and calculate final attribute values on the fly
            actor.sheet.render(true);
            // TODO: sheet not rendered yet :/
            document.querySelector('[data-tab="storyNotes"]').click();
            document.querySelector("div.LegendTab a.show-hidden").click();

            document.getElementsByName("data.dexterityadded")[0].value = parseInt(sstep.Attributes.Dex.Buildpoints);
            document.getElementsByName("data.strengthadded")[0].value = parseInt(sstep.Attributes.Str.Buildpoints);
            document.getElementsByName("data.toughnessadded")[0].value = parseInt(sstep.Attributes.Tou.Buildpoints);
            document.getElementsByName("data.perceptionadded")[0].value = parseInt(sstep.Attributes.Per.Buildpoints);
            document.getElementsByName("data.willpoweradded")[0].value = parseInt(sstep.Attributes.Wil.Buildpoints);
            document.getElementsByName("data.charismaadded")[0].value = parseInt(sstep.Attributes.Cha.Buildpoints);

            document.querySelector("button.buttonAction.finalizeBuild").click();

            console.log("Step2ED | Creating Actor Update Data");

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
                    "dexterityvalue": actor.data.data.attributes.dexterityinitial + sstep.Attributes.Dex.Increases,
                    "strengthvalue": actor.data.data.attributes.strengthinitial + sstep.Attributes.Str.Increases,
                    "toughnessvalue": actor.data.data.attributes.toughnessinitial + sstep.Attributes.Tou.Increases,
                    "perceptionvalue": actor.data.data.attributes.perceptioninitial + sstep.Attributes.Per.Increases,
                    "willpowervalue": actor.data.data.attributes.willpowerinitial + sstep.Attributes.Wil.Increases,
                    "charismavalue": actor.data.data.attributes.charismainitial + sstep.Attributes.Cha.Increases
                },
                "damage": {
                    "value": sstep.Damage
                },
                "wounds": sstep.Wounds,
                "recoverytestscurrent": 0,
                "legendpointtotal": sstep.LegendPoints
            }

            // go over equipment
            for (const item of sstep.Equipment) {
                switch (item.type) {
                    case "Valuable":
                        if (item.ID in ("Gold", "Silver", "Copper")) {
                            updateData.money[item.ID.toLowerCase()] = parseInt(item.Count);
                        }
                }

            }

            // TODO: create a JournalEntry where the sstep.Basic.LogText comes in

        } catch (e) {
            ui.notifications.error(e);
        }
    },

    importJSON: function(filepath) {
        console.log("Step2ED | Loading JSON file:\t" + filepath);
        $.getJSON(filepath, data => this._createFromJSON(data));
    },

    _removeEditionPrefix: function(string) {
        return string.remove('ED4',  '');
    }
}

class JSONPicker extends FilePicker {
    constructor(options = {}) {
        console.log("Step2ED | Create JSONPicker");
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
    console.log("Step2ED | In Hook: ready");
    step2ed.createImportButton()
})

Hooks.on("changeSidebarTab", function () {
    console.log("Step2ED | In Hook: changeSidebarTab");
    step2ed.createImportButton()
})

Hooks.on("renderSidebarTab", function () {
    console.log("Step2ED | In Hook: renderSidebarTab");
    step2ed.createImportButton()
})


