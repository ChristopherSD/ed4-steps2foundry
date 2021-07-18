Hooks.on("ready", function () {
    let createActorButton = $.("section#actors button.create-entity");
    createActorButton.contextmenu(function () {
        alert("Handler for .contextmenu called")
    });
});