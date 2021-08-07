const step2ed = {

    compThreadItems: "earthdawn-pg-compendium.goods",
    compSpells: "earthdawn-pg-compendium.spells",
    compDiscipline: "earthdawn-pg-compendium.disciplin",
    compNamegiver: "earthdawn-pg-compendium.namegiver",
    compSkills: "earthdawn-pg-compendium.skill-description",
    compTalents: "earthdawn-pg-compendium.talent-description",

    pointcost: {
        "-2": -2,
        "-1": -1,
        "0": 0,
        "1": 1,
        "2": 2,
        "3": 3,
        "5": 4,
        "7": 5,
        "9": 6,
        "12": 7,
        "15": 8
    },

    attributeAbbreviations: {
        "Dex": "dexterity",
        "Str": "strength",
        "Tou": "toughness",
        "Per": "perception",
        "Wil": "willpower",
        "Cha": "charisma"
    },

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

    _addNamegiverRace: async function(actor, namegiver) {
        const namegiverItem = await this._getCompendiumItem(this.compNamegiver, namegiver);
        await actor.createEmbeddedDocuments("Item", [namegiverItem]);
    },

    _createBaseAttributes: async function (actor, attributes) {
        // open the notes and legend tab of the character sheet to go to character creation
        // this is necessary since secondStep Jsons only have the starting point costs and calculate final attribute values on the fly
        await actor.sheet._render(true); // inner render method since the promise is not propagated outwards

        document.querySelector('[data-tab="storyNotes"]').click();
        document.querySelector("div.LegendTab a.show-hidden").click();

        for (const att in attributes) {
            if (!attributes.hasOwnProperty(att)) continue;

            const pointsCost = attributes[att].Buildpoints;
            const points = this.pointcost[pointsCost];

            let attribute = this.attributeAbbreviations[att];
            if (points === 0) {
                document.querySelector(`a.att-change-button[data-att="${attribute}"][data-direction="plus"]`).click();
                document.querySelector(`a.att-change-button[data-att="${attribute}"][data-direction="minus"]`).click();
            }
            else {
                let direction = points > 0 ? "plus" : "minus";
                let button = document.querySelector(`a.att-change-button[data-att="${attribute}"][data-direction="${direction}"]`);

                for (let i = 0; i < points; i++) {
                    button.click();
                }
            }
        }

        /*
        document.getElementsByName("data.dexterityadded")[0].value = parseInt(sstep.Attributes.Dex.Buildpoints);
        document.getElementsByName("data.strengthadded")[0].value = parseInt(sstep.Attributes.Str.Buildpoints);
        document.getElementsByName("data.toughnessadded")[0].value = parseInt(sstep.Attributes.Tou.Buildpoints);
        document.getElementsByName("data.perceptionadded")[0].value = parseInt(sstep.Attributes.Per.Buildpoints);
        document.getElementsByName("data.willpoweradded")[0].value = parseInt(sstep.Attributes.Wil.Buildpoints);
        document.getElementsByName("data.charismaadded")[0].value = parseInt(sstep.Attributes.Cha.Buildpoints);
        */

        document.querySelector("button.buttonAction.finalizeBuild").click();
        // TODO: the finalize Build button does not work????
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

            // get basic constants
            const edition = sstep.Options.Edition;
            const race = sstep.Race;

            // add namegiver race
            await this._addNamegiverRace(actor, this._removeEditionPrefix(race, edition));

            console.log("Step2ED | Creating Actor Update Data");

            let updateData = {
                "biography": sstep.Basic.Description,
                "height": sstep.Basic.Height,
                "sex": sstep.Basic.Gender,
                "weight": sstep.Basic.Weight,
                "age": sstep.Basic.Age,
                "hair": sstep.Basic.Hair,
                "eyes": sstep.Basic.Eyes,
                "skin": sstep.Basic.Skin,
                /*"attributes": {
                    "dexterityvalue": actor.data.data.attributes.dexterityinitial + sstep.Attributes.Dex.Increases,
                    "strengthvalue": actor.data.data.attributes.strengthinitial + sstep.Attributes.Str.Increases,
                    "toughnessvalue": actor.data.data.attributes.toughnessinitial + sstep.Attributes.Tou.Increases,
                    "perceptionvalue": actor.data.data.attributes.perceptioninitial + sstep.Attributes.Per.Increases,
                    "willpowervalue": actor.data.data.attributes.willpowerinitial + sstep.Attributes.Wil.Increases,
                    "charismavalue": actor.data.data.attributes.charismainitial + sstep.Attributes.Cha.Increases
                },*/
                "damage": {
                    "value": sstep.Damage
                },
                "money":{
                    "gold": 0,
                    "silver": 0,
                    "copper": 0
                },
                "wounds": sstep.Wounds,
                "legendpointtotal": sstep.LegendPoints
            }

            // go over equipment
            for (const item of sstep.Equipment) {
                switch (item.Type) {
                    case "Valuable":
                        if (["Gold", "Silver", "Copper"].indexOf(item.ID) > -1) {
                            updateData.money[item.ID.toLowerCase()] = parseInt(item.Count);
                        }
                }

            }

            // TODO: create a JournalEntry where the sstep.Basic.LogText comes in

            await actor.update({data: updateData});

            console.log("Step2ED | Creating base attributes");

            await this._createBaseAttributes(actor,sstep.Attributes);
            await actor.sheet.close();
            await actor.sheet._render(true);
        } catch (e) {
            ui.notifications.error(e);
        }
    },

    _getCompendiumItem: async function(compendiumName, itemName) {
        const pack = game.packs.get(compendiumName);
        const itemID = pack.index.getName(itemName)._id;
        const item = await pack.getDocument(itemID);
        return game.items.fromCompendium(item);
    },

    _removeEditionPrefix: function(string, edition) {
        return string.replace(edition,  '');
    },

    importJSON: function(filepath) {
        console.log("Step2ED | Loading JSON file:\t" + filepath);
        $.getJSON(filepath, data => this._createFromJSON(data));
    },
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


