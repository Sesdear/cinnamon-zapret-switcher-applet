const Applet = imports.ui.applet;
const Util = imports.misc.util;
const GLib = imports.gi.GLib;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const ByteArray = imports.byteArray;

function MyApplet(orientation, panel_height, instance_id) {
    this._init(orientation, panel_height, instance_id);
}

MyApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(orientation, panel_height, instance_id) {
        Applet.IconApplet.prototype._init.call(this, orientation, panel_height, instance_id);

        this.appletPath = imports.ui.appletManager.appletMeta["zapretswitcher-cinnamon@sesdear.github.io"].path;

        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this.menuManager.addMenu(this.menu);

        this.updateStatus();
        this._timeoutId = Mainloop.timeout_add_seconds(10, Lang.bind(this, this.updateStatus));
    },

    on_applet_clicked: function() {
        this.updateStatus();
        this.menu.toggle();
    },

    backtick: function(command) {
        try {
            let [ok, out] = GLib.spawn_command_line_sync(command);
            if (ok && out) {
                return ByteArray.toString(out).trim();
            }
            return "";
        } catch (e) {
            return "";
        }
    },

    getServiceStatus: function(service) {
        let status = this.backtick(`sh -c "systemctl is-active ${service} 2>/dev/null || echo unknown"`);
        status = status.split("\n")[0];
        return status || "unknown";
    },

    updateStatus: function() {
        let service = "zapret";
        let status = this.getServiceStatus(service);

        let iconsPath = GLib.build_filenamev([this.appletPath, "icons"]);
        let iconFile;
        let tooltip;

        if (status === "active") {
            iconFile = GLib.build_filenamev([iconsPath, "logo-on.svg"]);
            tooltip = "Zapret: активен";
        } else if (status === "inactive" || status === "failed") {
            iconFile = GLib.build_filenamev([iconsPath, "logo-off.svg"]);
            tooltip = `Zapret: ${status}`;
        } else {
            iconFile = GLib.build_filenamev([iconsPath, "logo-error.svg"]);
            tooltip = `Zapret: ${status}`;
        }

        this.set_applet_icon_path(iconFile);
        this.set_applet_tooltip(tooltip);

        this.menu.removeAll();

        this.menu.addMenuItem(new PopupMenu.PopupMenuItem(`Статус: ${status}`));

        let startItem = new PopupMenu.PopupMenuItem("Запустить");
        startItem.connect("activate", Lang.bind(this, function() {
            Util.spawnCommandLineAsync(`pkexec systemctl start ${service}`);
            Mainloop.timeout_add(1200, Lang.bind(this, this.updateStatus));
        }));
        this.menu.addMenuItem(startItem);

        let stopItem = new PopupMenu.PopupMenuItem("Остановить");
        stopItem.connect("activate", Lang.bind(this, function() {
            Util.spawnCommandLineAsync(`pkexec systemctl stop ${service}`);
            Mainloop.timeout_add(1200, Lang.bind(this, this.updateStatus));
        }));
        this.menu.addMenuItem(stopItem);

        let restartItem = new PopupMenu.PopupMenuItem("Перезапустить");
        restartItem.connect("activate", Lang.bind(this, function() {
            Util.spawnCommandLineAsync(`pkexec systemctl restart ${service}`);
            Mainloop.timeout_add(1600, Lang.bind(this, this.updateStatus));
        }));
        this.menu.addMenuItem(restartItem);
    },

    on_applet_removed_from_panel: function() {
        if (this._timeoutId) {
            Mainloop.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
    }
};

function main(metadata, orientation, panel_height, instance_id) {
    return new MyApplet(orientation, panel_height, instance_id);
}
