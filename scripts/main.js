class Step2Ed {

    constructor(filepath) {
        this.compGoods = "earthdawn-pg-compendium.goods";
        this.compSpells = "earthdawn-pg-compendium.spells";
        this.compDiscipline = "earthdawn-pg-compendium.disciplin";
        this.compNamegiver = "earthdawn-pg-compendium.namegiver";
        this.compSkills = "earthdawn-pg-compendium.skill-description";
        this.compTalents = "earthdawn-pg-compendium.talent-description";

        this.compTypes = {
            "earthdawn-pg-compendium.goods": "Equipment",
            "earthdawn-pg-compendium.spells": "Spells",
            "earthdawn-pg-compendium.disciplin": "Disciplines",
            "earthdawn-pg-compendium.namegiver": "Race",
            "earthdawn-pg-compendium.skill-description": "Skills",
            "earthdawn-pg-compendium.talent-description": "Talents"
        }

        this.pointcost = {
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
        };
        this.attributeAbbreviations = {
            "Dex": "dexterity",
            "Str": "strength",
            "Tou": "toughness",
            "Per": "perception",
            "Wil": "willpower",
            "Cha": "charisma"
        };

        this.filepath = filepath;

    }

    async importJSON() {
        console.debug("Step2ED | Loading JSON file:\t" + this.filepath);
        await $.getJSON(this.filepath, data => this.sstep = data);
        await this._import();
    }

    async _addDisciplines() {

        // get first discipline
        let disciplineEntry = null;
        let disciplines = [];
        for (const discipline of this.sstep.Disciplines) {
            disciplineEntry = discipline;
            let disciplineItem = await this._getCompendiumItem(
                this.compDiscipline,
                this._removeEditionPrefix(disciplineEntry.ID)
            );
            disciplineItem.data.circle = disciplineEntry.Circle;
            disciplines.push(disciplineItem);
        }

        if (disciplines.length < 1) {
            ui.notifications.warn(game.i18n.localize("WARNING.NoFirstDiscipline"));
            return;
        }

        await this.actor.createEmbeddedDocuments("Item", disciplines);
    }

    async _addNamegiverRace() {
        const namegiverItem = await this._getCompendiumItem(this.compNamegiver, this.race);
        await this.actor.createEmbeddedDocuments("Item", [namegiverItem]);
    }

    async _createBaseAttributes() {
        // open the notes and legend tab of the character sheet to go to character creation
        // this is necessary since secondStep Jsons only have the starting point costs and calculate final attribute values on the fly
        await this.actor.sheet._render(true); // inner render method since the promise is not propagated outwards

        document.querySelector('[data-tab="storyNotes"]').click();
        document.querySelector("div.LegendTab a.show-hidden").click();

        const attributes = this.sstep.Attributes;
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

        document.querySelector("button.buttonAction.finalizeBuild").click();
        // the finalize Build button only works when no action afterwards except re-rendering the sheet?
    }

    async _import() {
        if (!this.sstep.hasOwnProperty("StepsVersion")) {
            ui.notifications.error(game.i18n.localize("ERROR.InvalidSecStepFile"));
            return;
        }

        try {
            console.debug("Step2ED | Creating new Actor");

            this.actor = await Actor.create({
                name: this.sstep.Basic.Name,
                type: "pc",
                image: this.sstep.PortraitURL
            });

            // get basic constants
            this.edition = this.sstep.Options.Edition;
            this.race = this._removeEditionPrefix(this.sstep.Race);

            console.debug("Step2ED | Adding Namegiver Race");
            await this._addNamegiverRace();

            console.debug("Step2ED | Adding First Discipline");
            await this._addDisciplines();

            console.debug("Step2ED | Creating Actor Update Data");

            let updateData = {
                "biography": this.sstep.Basic.Description,
                "height": this.sstep.Basic.Height,
                "sex": this.sstep.Basic.Gender,
                "weight": this.sstep.Basic.Weight,
                "age": this.sstep.Basic.Age,
                "hair": this.sstep.Basic.Hair,
                "eyes": this.sstep.Basic.Eyes,
                "skin": this.sstep.Basic.Skin,
                /*"attributes": {
                    "dexterityvalue": actor.data.data.attributes.dexterityinitial + this.sstep.Attributes.Dex.Increases,
                    "strengthvalue": actor.data.data.attributes.strengthinitial + this.sstep.Attributes.Str.Increases,
                    "toughnessvalue": actor.data.data.attributes.toughnessinitial + this.sstep.Attributes.Tou.Increases,
                    "perceptionvalue": actor.data.data.attributes.perceptioninitial + this.sstep.Attributes.Per.Increases,
                    "willpowervalue": actor.data.data.attributes.willpowerinitial + this.sstep.Attributes.Wil.Increases,
                    "charismavalue": actor.data.data.attributes.charismainitial + this.sstep.Attributes.Cha.Increases
                },*/
                "damage": {
                    "value": this.sstep.Damage
                },
                "money":{
                    "gold": 0,
                    "silver": 0,
                    "copper": 0
                },
                "wounds": this.sstep.Wounds,
                "legendpointtotal": this.sstep.LegendPoints
            }

            for (const item of this.sstep.Equipment) {
                switch (item.Type) {
                    case "Valuable":
                        if (["Gold", "Silver", "Copper"].indexOf(item.ID) > -1) {
                            updateData.money[item.ID.toLowerCase()] = parseInt(item.Count);
                        }
                }

            }

            console.debug("Step2ED | Getting Items")
            const talents = await this._getAllItemsFromComp(this.compTalents);
            const skills = await this._getAllItemsFromComp(this.compSkills);
            const spells = await this._getAllItemsFromComp(this.compSpells);
            const equipment = await this._getAllItemsFromComp(this.compGoods);

            // TODO: create a JournalEntry where the sstep.Basic.LogText comes in

            console.debug("Step2ED | Adding Items to Actor")
            await this.actor.createEmbeddedDocuments("Item", talents.concat(skills, spells, equipment));

            console.debug("Step2ED | Updating Actor Data")
            await this.actor.update({data: updateData});

            console.debug("Step2ED | Creating base attributes");

            await this._createBaseAttributes();
            await this.actor.sheet.close();
            await this.actor.sheet._render(true);
        } catch (e) {
            ui.notifications.error(game.i18n.localize("ERROR.UnableToImport"));
            console.error(e);
        }
    }

    async _getCompendiumItem(compendiumName, itemName) {
        try {
            const pack = game.packs.get(compendiumName);
            const itemID = pack.index.getName(itemName)._id;
            const item = await pack.getDocument(itemID);
            return game.items.fromCompendium(item);
        } catch (e) {
            console.log(`Step2ED | Could not retrieve item "${itemName}" from compendium "${compendiumName}"`)
            return {};
        }
    }

    async _getAllItemsFromComp(compName) {
        const compType = this.compTypes[compName];
        console.debug(`Getting ${compType} Items`);

        let items = []
        let sstepItems = this.sstep[compType];
        if (!Array.isArray(sstepItems)) {
            console.warn("Could not get second step items for type: " + compType);
            return;
        }

        for (const itemEntry of sstepItems) {
            // get item as object from compendium
            let compItem = await this._getCompendiumItem(compName, this._getItemNameForComp(itemEntry.ID, compType));

            // check if compItem is empty for error handling
            if (!$.isEmptyObject(compItem)) {

                // set item type specific data
                switch (compType) {
                    case "Talents":
                        compItem.data.ranks = itemEntry.Rank;
                        compItem.data.source = itemEntry.Type === "Optional" ? "Option" : itemEntry.Type;
                        break;
                    case "Skills":
                        compItem.data.ranks = itemEntry.Rank;
                        break;
                    case "Equipment":
                        compItem.data.amount = itemEntry.Count;
                }

                // put it in the items that are returned
                items.push(compItem);
            }
        }
        return items;
    }

    _getItemNameForComp(sstepID, compType) {
        let name = this._spaceCamelCase(sstepID);

        // for Thread Weaving Talent
        if (name.indexOf("Thread Weaving ") > -1) {
            const threadWeav = "Thread Weaving ";
            name = threadWeav + "(" + name.substring(threadWeav.length) + ")";
        }

        // for Spells
        if ((compType === "Spells") && (new RegExp(/(E|I|N|W|S)\s\w/, 'i').test(name))) {
            name = name.substring(name.indexOf(' ') + 1);
        }

        console.debug("Compendium Item Name:\t" + name);
        return name;
    }

    _removeEditionPrefix(string) {
        return string.replace(this.edition,  '');
    }

    _spaceCamelCase(string) {
        return this._removeEditionPrefix(string)
            .replace(/([A-Z])/g, ' $1')
            .trim();
    }
}

class JSONPicker extends FilePicker {
    constructor(options = {}) {
        console.debug("Step2ED | Create JSONPicker");
        super(options);
        this.extensions = ['.json', '.JSON']
    }
}

function createImportButton() {
    // Do Hooks get called twice?
    // At least it appends the button twice, so check if already exists..
    if (!!document.getElementById("import-button-secondstep")) return;

    console.debug("Step2ED | Adding Import Button");

    // find the create-entity buttons and insert our import button after them
    let createButtons =  $("section#actors div.header-actions.action-buttons.flexrow");

    const importButton = $(
        `<div class="header-import action-buttons flexrow"><button type="button" id="import-button-secondstep"><i class="fas fa-download "></i>${game.i18n.localize("CONTEXT.ImportSecStep")}</button></div>`
    );

    createButtons[0].insertAdjacentHTML('afterend', importButton[0].outerHTML);

    // create a file picker and bind it to the new button
    document.getElementById("import-button-secondstep").addEventListener("click", function() {
        new JSONPicker({
            callback: file => {
                let importer = new Step2Ed(file);
                importer.importJSON();
            }
        }).browse();
    });
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
    console.debug("Step2ED | In Hook: ready");
    createImportButton()
})

Hooks.on("changeSidebarTab", function () {
    console.debug("Step2ED | In Hook: changeSidebarTab");
    createImportButton()
})

Hooks.on("renderSidebarTab", function () {
    console.debug("Step2ED | In Hook: renderSidebarTab");
    createImportButton()
})


