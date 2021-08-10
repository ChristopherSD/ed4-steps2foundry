# Steps2Foundry
A Foundry VTT module to import characters created with [SecondStep](www.secondstep.dk/Steps/) into the [Earthdawn 4th Edition game system](https://foundryvtt.com/packages/earthdawn4e) in [Foundry VTT](https://foundryvtt.com/).


## Requirements
The module currently is built to only work with the [Earthdawn 4th Edition Player's Guide](https://foundryvtt.com/packages/earthdawn-pg-compendium), which has to be activated in your game. This is because it contains all talents/skills/disciplines/namegivers/equipment and to avoid licensing issues.


## How to Use
1. After installing and activating the module in your game, you should see a button ("Import 2ndStep") in the Actors Directory of your sidebar. 

![image](https://user-images.githubusercontent.com/15212005/128745517-5a626f95-60ff-46f7-bf16-eb7727ec0aec.png)

2. Click the button: a dialog opens, asking you to select a file. Choose the \*.json file you downloaded from [SecondStep](www.secondstep.dk/Steps/), and click _Select File_.

3. The module then does its magic, and you should see a new character sheet open on the screen.

4. Check if everything worked out and have a look in the Journals Directory in the sidetab for log files (in the folder _Steps2Foundry_).

![image](https://user-images.githubusercontent.com/15212005/128746862-b18ca2e0-c06a-4b44-a007-5bdcb377b018.png)

_(yes, I promise I will change the background color some day)_

5. Done!
 

## Tips & Tricks
- The module receives items in Foundry VTT from the [Earthdawn 4th Edition Player's Guide](https://foundryvtt.com/packages/earthdawn-pg-compendium). Since there are no fixed naming conventions for these items (especially when it comes to things like Knowledge/Artisan Skills and the such), the importer might not find all listed items in the file. To check and edit these items, a log file as a Journal Entry in the folder _Steps2Foundry_. After importing, control this log to edit and finalize your character creation and add all missing items.
- The "Log" field from SecondStep is imported as a Journal Entry. This is found in the folder _Steps2Foundry_ as well.
- If your SecondStep file has character art/an image it can be automatically loaded. For this to be possible, the image has to come frome a valid absolut URL, that is, a publicly available internet site (the url you get when right-clicking an online image and select an option like "Show Image in New Tab").


## Fair Warnings
- This is somewhat of an alpha/beta version, a first release. There might be stuff not working right now. If you find this stuff, please open an issue here on github and I will try to take care of it as soon as possible.
- The module is currently only tested with files generated from the online version of SecondStep. Feel free to try it with the standalone application and let me know how it goes.
- The character sheet that opens up will flicker for a second. That is because the sheet has to be closed and re-opened for some changes to take effect. I'm trying to find another solution to this, but this is currently the only working possibility, sorry.
- If you don't need to import any more characters, you can just disable the module in the settings, this way the import button disappears and doesn't clutter your UI.


## Other stuff
I hope this helps, and don't hesitate to contact me with questions.

**I love you all**
