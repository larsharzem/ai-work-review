# Handoff: Fork von AI Work Review (Stand 2026-10-02, v0.9.0)

Für die nächste Claude-Code-Sitzung in diesem Repo. Das Repo ist der Fork `larsharzem/ai-work-review` des Obsidian-Plugins von `zhouweijie` (Basis v0.8.0). Eingesetzt wird es im Vault `C:\Users\Administrator\OneDrive\obsidian` (aus WSL: `/mnt/c/Users/Administrator/OneDrive/obsidian`), Plugin-Ordner `.obsidian/plugins/ai-work-review/`. Der Vault nutzt nur den Modus `novel`; der Modus `dev` wird dort nicht benutzt.

## Erledigt (alles aus dem alten Handoff, plus Tests und Skills)

1. **Verhaltensänderung 1** — ein neu importierter Bericht hebt ein `userVerdict: "pass"` der Zieldatei auf (`ingestBridge()` in `src/main.ts`, History-Detail `superseded by a newer AI report`). `userVerdict: "fail"` (Adjust) bleibt samt `userNote` erhalten.
2. **Verhaltensänderung 2** — eine Datei mit Ersatzfassung bleibt unter „Issues only" sichtbar, auch bei Status `pass`. Das Prädikat heißt jetzt `needsAttention(fr, hasProposal)` und liegt in `src/store.ts` (vorher inline in `view.ts`), damit ein Test es festnageln kann.
3. **Vokabular englisch** in `src/`, `test/`, `skills/` und `README.md`: Statuswerte, Feldnamen, Abschnittsüberschriften, Ordner-/Dateinamen, Kartendateien (`_module.md`, `_index.md`, `_api.md`, `_tags.md`, `_compare-report.md`, `_check-report.md`), Tag-Namensräume (`#capability/…`, `#scenario/…`), Archiv-Zeiger, `history.action`-Werte, Regex-Defaults, Default-Settings, Sortier-Locale. Die Tabelle alt → neu steht im `README.md` unter „This fork (0.9.0)".
4. **Tests laufen** (`npm test`, grün): `test/fixture-vault.mjs` baut einen Wegwerf-Vault im Temp-Verzeichnis, `test/run.mjs` (10 Abschnitte, inkl. neuem Store-Abschnitt) und `test/integration.mjs` laufen dagegen. Kein konfigurierter Vault nötig; `test/vault-root.mjs` ist gelöscht. Vorher schrieb die Integration ihre Fixtures in den echten Vault und löschte am Ende `.ai-review/` — das kann jetzt nicht mehr passieren.
5. **Zwei echte Fehler** nebenbei gefunden und behoben:
   - `setFieldValue` schrieb `- **Module**:finance` ohne Leerzeichen, weil die englischen Vorlagen den ASCII-Doppelpunkt ohne Folgeleerzeichen lassen. Schreibt jetzt `- **Field**: value`, normalisiert `：` → `:` und ist `$`-sicher (Funktions-Replacement).
   - `src/ingest.ts` gab seine Parse-Fehler auf Chinesisch zurück, obwohl sie nicht in `src/i18n.ts` stehen (also auch in der englischen Oberfläche chinesisch erschienen). Jetzt englisch.
6. **i18n-Default** ist `en` (vorher `zh`), Fallback in `t()` ebenfalls `en`.
7. **Version 0.9.0** in `manifest.json`, `package.json`, `versions.json`; `README.md` hat einen Fork-Abschnitt.
8. **Installiert**: `vaults.local.json` (gitignored) zeigt auf den Vault, `npm run build` installiert dorthin. `main.js` 0.9.0 liegt im Vault.
9. **Routinen-Prompts** unter `C:\Users\Administrator\.claude\scheduled-tasks\` angepasst: in `akquise-pflege/SKILL.md` sind „Nutzerurteil löschen" und „Reihenfolge" ersetzt durch einen Absatz, dass nie in `data.json` geschrieben wird (das Plugin erledigt beides); der Neulade-Hinweis in `## 5. Bericht an mich` ist weg. In `akquise-mail/SKILL.md` und `akquise-linkedin/SKILL.md` ist der falsche Satz „Ohne diesen Bericht steht die Zieldatei … auf ‚Pass'" durch den jetzt zutreffenden Grund ersetzt (Bericht nennt die Änderung im Panel und hebt ein früheres „Pass" auf). Die Berichte selbst bleiben — Verhaltensänderung 1 hängt an ihnen.

### Wirkung im echten Vault (gegen die echte `data.json` nachgerechnet, read-only)

33 Ersatzfassungen unter `.ai-review/proposals/App-Idee/Kontakte/`; vorher waren unter „Issues only" 3 davon sichtbar (29× `pass` vom Nutzer, 1× `pass` von der KI verdeckten sie), jetzt alle 33.

## Offen / zu beachten

- **Obsidian muss das Plugin neu laden** (aus- und einschalten oder Obsidian neu starten), sonst läuft weiter 0.8.0 aus dem Speicher. Danach prüfen: die 33 Dateien erscheinen unter „Issues only" mit Badge „Proposal ready".
- Im Vault liegt noch `.ai-review/legacy/需求模板.md` aus der alten Version; 0.9.0 legt beim Start zusätzlich `requirements-template.md` daneben. Beide sind ungenutzt (Modus `dev` wird in diesem Vault nicht benutzt) — die chinesische Datei kann weg.
- **Nicht committet/gepusht?** Siehe `git log`: v0.9.0 ist committet. `git push` nach `origin` (`git@github.com:larsharzem/ai-work-review.git`) ist noch nicht erfolgt (bewusst, nicht ohne Zuruf).
- `git` von der Windows-Seite meldet „dubious ownership", deshalb innerhalb von WSL aufrufen (`wsl -d Ubuntu -- bash -lc "cd /home/lars/projects/ai-work-review && git status"`).

### Gewollt chinesisch (kein Nachholbedarf)

- `src/i18n.ts` Zeilen 7–225: die `zh`-Oberflächentabelle. In `en` heißen die `/dev-review`-Unterbefehle `adjust`, `change`, `fix-bug`, `start`, `integrate` (wie die Dateien unter `skills/cursor-commands/`).
- `zh: "中文"` als Label der Sprachauswahl in `src/settings.ts`.
- Regex-Klassen, die beide Interpunktionsvarianten lesen: `[:：]` (`src/dev.ts`, `src/rules.ts`, `src/view.ts`), `[（(]`/`[）)]`, `[,，]`, die CJK-Satzzeichenliste in `isBlankValue`. Zwei Test-Assertions in `test/run.mjs` nageln diese Toleranz absichtlich fest (Zeilen mit `**Status**：`).
- Kommentare in `src/` (teils chinesisch) — laut Zielsetzung nicht gemeint.
- **Die Prosa in `skills/`** bleibt chinesisch: übersetzt wurde dort nur, was in Dokumente geschrieben oder aus ihnen gelesen wird. Die Unterbefehlsnamen bleiben zweisprachig (`/dev-review 调整` = `/dev-review adjust`), `skills/cursor-commands/` liefert beide Schreibweisen. Wer die Prosa auch englisch will, hat ~2000 Zeilen Fließtext vor sich — rein kosmetisch, keine Funktion.
