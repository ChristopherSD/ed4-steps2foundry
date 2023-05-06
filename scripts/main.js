class Steps2Foundry {

    constructor(filepath) {
        // supported character sheets
        this.sheetTaka = "TakaCharacterSheet";
        this.sheetDefault = "earthdawn4ePCSheet";

        this.compGoods = "earthdawn-pg-compendium.goods";
        this.compSpells = "earthdawn-pg-compendium.spells";
        this.compDiscipline = "earthdawn-pg-compendium.disciplines";
        this.compNamegiver = "earthdawn-pg-compendium.namegiver";
        this.compSkills = "earthdawn-pg-compendium.skill-description";
        this.compTalents = "earthdawn-pg-compendium.talent-description";
        this.compThreadItems = "earthdawn-gm-compendium.thread-items";

        this.compTypes = {
            "earthdawn-pg-compendium.goods": "Equipment",
            "earthdawn-pg-compendium.spells": "Spells",
            "earthdawn-pg-compendium.disciplines": "Disciplines",
            "earthdawn-pg-compendium.namegiver": "Race",
            "earthdawn-pg-compendium.skill-description": "Skills",
            "earthdawn-pg-compendium.talent-description": "Talents",
            "earthdawn-gm-compendium.thread-items": "Thread Items"
        }

        this.moneyNames = ["Gold", "Silver", "Copper"];

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
        this.namegiverAttributeNames = {
            "Dex": "dexterityvalue",
            "Str": "strengthvalue",
            "Tou": "toughnessvalue",
            "Per":"perceptionvalue",
            "Wil":"willpowervalue",
            "Cha":"charismavalue"
        }

        this.journalLogText = "";

        this.filepath = filepath;
    }

    async importJSON() {
        console.debug("Steps2Foundry | Loading JSON file:\t" + this.filepath);
        await $.getJSON(this.filepath, data => this.sstep = data);
        await this._import();
    }

    async _addDisciplines() {

        // catch version difference of player guid with discipline pack naming
        if (!game.packs.has(this.compDiscipline)) {
            this.compDiscipline = "earthdawn-pg-compendium.disciplin";
        }


        // get first discipline
        let disciplineEntry = null;
        let disciplines = [];
        for (const discipline of this.sstep.Disciplines) {
            disciplineEntry = discipline;
            let disciplineItem = await this._getCompendiumItem(
                this.compDiscipline,
                this._getItemNameForComp(
                    this._removeEditionPrefix(
                        disciplineEntry.ID
                    ),
                    this.compTypes[this.compDiscipline]
                )
            );
            if (disciplineItem.type === 'discipline') {
                disciplineItem.system.circle = disciplineEntry.Circle;
                disciplines.push(disciplineItem);
            }
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

        let sheetName = this.actor._getSheetClass().name;

        if (sheetName === this.sheetDefault) {
            // open the notes and legend tab of the character sheet to go to character creation
            // this is necessary since secondStep Jsons only have the starting point costs and calculate final attribute values on the fly
            await this.actor.sheet._render(true); // inner render method since the promise is not propagated outwards

            document.querySelector('[data-tab="storyNotes"]').click();
            document.querySelector("div.LegendTab a.show-hidden").click();
        }
        else if (sheetName === this.sheetTaka) {
            /*await document.querySelector('a.chargen').click();
            await this.actor.sheet._render(true);*/

            const namegiverBase = this.actor.items.filter(e => e.type === 'namegiver')[0].system.attributes;
            let newAttributes = {};
            for (let [att, points] of Object.entries(this.sstep.Attributes)) {
                let addedValue = Number(this.pointcost[points["Buildpoints"]]) +
                    Number(this.pointcost[points["Increases"]]);
                let baseValue = Number(namegiverBase[this.namegiverAttributeNames[att]]);
                newAttributes[att] = baseValue + addedValue;
            }

            const unspentPoints = 25 -
                Object.values(this.sstep.Attributes)
                    .map(e => Number(e.Buildpoints))
                    .reduce((a, b) => a + b);

            await this.actor.update({
                'system.attributes.dexterityinitial': newAttributes["Dex"],
                'system.attributes.strengthinitial': newAttributes["Str"],
                'system.attributes.toughnessinitial': newAttributes["Tou"],
                'system.attributes.perceptioninitial': newAttributes["Per"],
                'system.attributes.willpowerinitial': newAttributes["Wil"],
                'system.attributes.charismainitial': newAttributes["Cha"],
                'system.attributes.dexterityvalue': newAttributes["Dex"],
                'system.attributes.strengthvalue': newAttributes["Str"],
                'system.attributes.toughnessvalue': newAttributes["Tou"],
                'system.attributes.perceptionvalue': newAttributes["Per"],
                'system.attributes.willpowervalue': newAttributes["Wil"],
                'system.attributes.charismavalue': newAttributes["Cha"],
                'system.unspentattributepoints': unspentPoints
            });

            return;
        }


        const attributes = this.sstep.Attributes;
        // sort the attribute buildpoints ascending, since the character creation does not allow excess point input#
        let buildpoints = {};
        for (const a in attributes) {
            if (!attributes.hasOwnProperty(a)) continue;
            buildpoints[a] = String(attributes[a].Buildpoints);
        }
        const sortedAttributes = Object.entries(buildpoints).sort(([,a],[,b]) => a-b);

        for (const att of sortedAttributes) {
            const pointsCost = att[1];
            const points = this.pointcost[pointsCost];

            let attribute = this.attributeAbbreviations[att[0]];
            if (points === 0) {
                document.querySelector(`a.att-change-button[data-att="${attribute}"][data-direction="minus"]`).click();
                document.querySelector(`a.att-change-button[data-att="${attribute}"][data-direction="plus"]`).click();
            }
            else {
                let direction = points > 0 ? "plus" : "minus";
                let button = document.querySelector(`a.att-change-button[data-att="${attribute}"][data-direction="${direction}"]`);

                for (let i = 0; i < Math.abs(points); i++) {
                    button.click();
                }
            }
        }

        document.querySelector("button.buttonAction.finalizeBuild").click();
        // the finalize Build button only works when no action afterwards except re-rendering the sheet?
    }

    _createJournalText(text) {
        if (!text) return "";

        const pTagOpen = '<p class="MsoNormal" style="margin-bottom:.0001pt;line-height:normal;mso-layout-grid-align:none;text-autospace:none">';
        const pTagClose = '</p>';

        return pTagOpen + text.split("\n").join(pTagClose + pTagOpen) + pTagClose;
    }

    async _import() {
        if (!this.sstep.hasOwnProperty("StepsVersion")) {
            ui.notifications.error(game.i18n.localize("ERROR.InvalidSecStepFile"));
            return;
        }

        try {
            console.debug("Steps2Foundry | Create new JournalEntry Folder");
            let journalFolder = game.folders.getName("Steps2Foundry") || await Folder.create(
                {
                    "name": "Steps2Foundry",
                    "type": "JournalEntry",
                    "description": "<p>Contains data created by the import process of the Steps2Foundry Module</p>",
                    "color": "#efd1c5"
                });

            console.debug("Steps2Foundry | Creating new Actor");

            this.actor = await Actor.create({
                name: this.sstep.Basic.Name || "SecondStep - No Name at Import",
                type: "pc",
                image: this.sstep.PortraitURL
            });

            // get basic constants
            this.edition = this.sstep.Options.Edition;
            this.race = this._getItemNameForComp(
                this._removeEditionPrefix(this.sstep.Race),
                this.compTypes[this.compNamegiver]
            );

            console.debug("Steps2Foundry | Adding Namegiver Race");
            await this._addNamegiverRace();

            console.debug("Steps2Foundry | Adding First Discipline");
            await this._addDisciplines();

            console.debug("Steps2Foundry | Creating Actor Update Data");

            let updateData = {
                "description": this.sstep.Basic.Description,
                "height": this.sstep.Basic.Height,
                "gender": this.sstep.Basic.Gender,
                "weight": this.sstep.Basic.Weight,
                "age": this.sstep.Basic.Age,
                "hair": this.sstep.Basic.Hair,
                "eyes": this.sstep.Basic.Eyes,
                "skin": this.sstep.Basic.Skin,
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
                if (item.Type === "Valuable") {
                    if (this.moneyNames.indexOf(item.ID) > -1) {
                        updateData.money[item.ID.toLowerCase()] = parseInt(item.Count);
                    }
                }

            }

            console.debug("Steps2Foundry | Getting Items")
            const talents = await this._getAllItemsFromComp(this.compTalents);
            const skills = await this._getAllItemsFromComp(this.compSkills);
            const spells = await this._getAllItemsFromComp(this.compSpells);
            const equipment = await this._getAllItemsFromComp(this.compGoods);
            const threadItems = await this._getAllItemsFromComp(this.compThreadItems);

            await JournalEntry.create(
                {
                    "name": game.i18n.format("JOURNAL.NamesJournal", {"name": this.sstep.Basic.Name}),
                    "content": this._createJournalText(this.sstep.Basic.LogText),
                    "folder": journalFolder.id
                });

            console.debug("Steps2Foundry | Adding Items to Actor")
            await this.actor.createEmbeddedDocuments("Item", talents.concat(skills, spells, equipment, threadItems));

            console.debug("Steps2Foundry | Updating Actor Data")
            await this.actor.update({system: updateData});

            console.debug("Steps2Foundry | Creating base attributes");

            await this._createBaseAttributes();
            await this.actor.sheet.close();
            await this.actor.sheet._render(true);

            // create import log as journal entry for easy user lookup
            await JournalEntry.create(
                {
                    "name": game.i18n.format("JOURNAL.ImportLogEntryName", {"name": this.sstep.Basic.Name}),
                    "content": this.journalLogText,
                    "folder": journalFolder.id
                });

            ui.notifications.info(game.i18n.format("INFO.SuccessfullImport", {"name": this.sstep.Basic.Name}));
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
            const missingItemMessage = game.i18n.format(
                "JOURNAL.MissingCompItem",
                {
                    "itemName": itemName,
                    "compendiumName": compendiumName
                });
            this.journalLogText += this._createJournalText("Compendium Item | " + missingItemMessage);
            console.log("Steps2Foundry | " + missingItemMessage)
            return {};
        }
    }

    async _getAllItemsFromComp(compName) {
        const compType = this.compTypes[compName];
        console.debug(`Getting ${compType} Items`);

        let items = []
        let sstepItems;
        if (compType === "Thread Items") {
            sstepItems = this.sstep["Equipment"].filter(e => e["Type"] === "Thread Item");
        }
        else if (compType === "Equipment") {
            sstepItems = this.sstep["Equipment"].filter(e => e["Type"] !== "Thread Item");
        }
        else {
            sstepItems = this.sstep[compType];
        }

        if (!Array.isArray(sstepItems)) {
            console.warn("Could not get second step items for type: " + compType);
            return;
        }

        for (const itemEntry of sstepItems) {
            // get item as object from compendium
            const itemName = this._getItemNameForComp(itemEntry.ID, compType, itemEntry.Name ?? "");
            if (this.moneyNames.indexOf(itemName) > -1) continue; // Skip money, already done outside
            let compItem = await this._getCompendiumItem(compName, itemName);

            // check if compItem is empty for error handling
            if (!$.isEmptyObject(compItem)) {

                // set item type specific data
                switch (compType) {
                    case "Talents":
                        compItem.system.ranks = itemEntry.Rank;
                        compItem.system.source = itemEntry.Type === "Optional" ? "Option" : itemEntry.Type;
                        break;
                    case "Skills":
                        compItem.system.ranks = itemEntry.Rank;
                        break;
                    case "Equipment":
                        compItem.system.amount = itemEntry.Count;
                }

                // put it in the items that are returned
                items.push(compItem);
            }
        }
        return items;
    }

    _getItemNameForComp(sstepID, compType, sstepName = "") {
        let name = this._spaceCamelCase(sstepID);

        switch (compType) {
            case "Talents":
                // for Thread Weaving Talent
                if (name.indexOf("Thread Weaving ") > -1) {
                    const threadWeav = "Thread Weaving ";
                    name = threadWeav + "(" + name.substring(threadWeav.length) + ")";
                }
                if (name.startsWith("Read ")) name = "Read and Write Language"
                break;
            case "Skills":
                if (name.startsWith("Read ")) {
                    name = "Read/Write Language"
                }
                // artisan and knowledge skills
                else if (name.startsWith("Artisan")) {
                    name = "Artisan Skill (" + sstepName + ")";
                }
                else if (name.startsWith("Knowledge")) {
                    name = "Knowledge (" + sstepName + ")";
                }
                if (name.includes("Entertainer")) {
                    name = "Entertainer";
                }
                break;
            case "Spells":
                // the starting letters of the spellcasting disciplines (including Shaman already)
                if (new RegExp(/([EINWS])\s\w/, 'i').test(name)) {
                    name = name.substring(name.indexOf(' ') + 1);
                }
                if (name.includes("Circleof")) {
                    name = "Life Circle of One";
                }
                if (name.includes("Jeer")) {
                    name = "Fog of Jeer";
                }
                if (name.endsWith("Unseen")) {
                    name = "See the Unseen";
                }
                break;
            case "Race":
                if (name.indexOf("krang") > -1) {
                    name = "T'skrang";
                }
                break;
            case "Equipment":
                if (name.includes("Travelers")){
                    name = name.replace("Travelers", "Traveler's");
                }
                if (name.includes("Peasants")){
                    name = name.replace("Peasants", "Peasant's");
                }
                if (name.includes("Rations")) {
                    if (name.includes("Trail")) {
                        name = "Rations, Trail (1 Week)";
                    }
                    if (name.includes("Mine")) {
                        name = "Rations, Mine (1Week)";
                    }
                }
                if (name.includes("Physicians")) {
                    name = name.replace("Physicians", "Physician's");
                }
                if (name.includes("Artisan Tools ")) {
                    name = "Artisan Tools (" + name.substring("Artisan Tools ".length) + ")";
                }
                if (name.includes("Cloak")) {
                    name = "Cloak" + "," + name.substring("Cloak".length);
                }
                if (name.includes("Shirt")) {
                    name = "Shirt" + "," + name.substring("Shirt".length);
                }
                if (name.includes("Boots")) {
                    name = "Boots" + "," + name.substring("Boots".length);
                }
                if (name.includes("Breeches")) {
                    name = "Breeches" + "," + name.substring("Breeches".length);
                }
                if (name.includes("Flint")) {
                    name = "Flint and Steel";
                }
                if (name.includes("Wateror")) {
                    name = "Water or Wine Skin";
                }
                if (name.includes("Scroll Case")) {
                    name = "Map and Scroll Case";
                }
                if (name.includes("Light Bolts")) {
                    name += " (15)";
                }
                if (name.endsWith(" J")) {
                    name = name.replace(/.$/,"(Journeyman)");
                }
                if (name.endsWith(" N")) {
                    name = name.replace(/.$/,"(Novice)");
                }
                if (name.endsWith(" W")) {
                    name = name.replace(/.$/,"(Warden)");
                }
                break;
            case "Thread Items":
                if (name.endsWith(" J")) {
                    name = name.replace(/.$/,"(Journeyman)");
                }
                if (name.endsWith(" N")) {
                    name = name.replace(/.$/,"(Novice)");
                }
                if (name.endsWith(" W")) {
                    name = name.replace(/.$/,"(Warden)");
                }
                break;
        }

        console.debug(compType + "Compendium Item Name:\t" + name);
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
        console.debug("Steps2Foundry | Create JSONPicker");
        super(options);
        this.extensions = ['.json', '.JSON']
    }
}

function createImportButton(html) {
    // Do Hooks get called twice?
    // At least it appends the button twice, so check if already exists..
    if (!!document.getElementById("import-button-secondstep")) return;

    console.debug("Steps2Foundry | Adding Import Button");

    // find the create-entity buttons and insert our import button after them
    // let createButtons =  $("section#actors div.header-actions.action-buttons.flexrow");

    const importButton = $(
        `<div class="header-import action-buttons flexrow"><button type="button" id="import-button-secondstep"><i class="fas fa-download "></i>${game.i18n.localize("CONTEXT.ImportSecStep")}</button></div>`
    );

    // create a file picker and bind it to the new button
    importButton.click(function() {
        new JSONPicker({
            callback: file => {
                let importer = new Steps2Foundry(file);
                importer.importJSON();
            }
        }).browse();
    });

    html.find('.header-actions').append(importButton)

    // createButtons[0].insertAdjacentHTML('afterend', importButton[0].outerHTML);
}

Hooks.on("init", function () {
    console.log("###############\n\nSecond Step Import for ED4:\n\tWe're on!\n\n###############");
})

/*
Hooks.on("ready", function () {
    console.debug("Steps2Foundry | In Hook: ready");
    createImportButton()
})

Hooks.on("changeSidebarTab", function () {
    console.debug("Steps2Foundry | In Hook: changeSidebarTab");
    createImportButton()
})
*/

Hooks.on("renderSidebarTab", async (app, html) => {
    if (app.options.id === 'actors') {
        console.debug("Steps2Foundry | In Hook: renderSidebarTab");
        createImportButton(html)
    }
})
