UUID := airplay-toggle@ekorre.hr
ZIP  := $(UUID).shell-extension.zip

.PHONY: pack install uninstall clean

pack: $(ZIP)

$(ZIP): $(UUID)/metadata.json $(UUID)/extension.js
	gnome-extensions pack $(UUID) --force

install: $(ZIP)
	gnome-extensions install --force $(ZIP)
	@echo "Log out and back in (Wayland), then: gnome-extensions enable $(UUID)"

uninstall:
	gnome-extensions uninstall $(UUID)

clean:
	rm -f $(ZIP)
