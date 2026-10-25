# KFL Dashboard 2.0: Anforderungen (Originalvorgabe Tobias, 25.10.2026)

> Passwörter aus der Vorgabe sind hier bewusst entfernt. Sie werden nur als verschlüsseltes Secret im System hinterlegt.

Überarbeite das Komplette Dashboard auf cloudflaire wie folgt:   Es unterteilt sich in ein internes Dashboard und ein externes Dashboard, das interne Dashboard soll nur für Mitarbeiter der KFL GbR sein und hat andere Möglichkeiten und Ansichten, dass externe Dashboard soll für Geschäftspartner sein, welche die Anfragen verwalten.   Kurze Vorabinformationen zu den Bords und was wir damit machen wollen:   Wir erhalten von Kunden anfragen zu Fahrzeugen kaufen oder Verkauf, diese sollen bei uns verwaltet werden, ein Lead daraus genereiert werden. Anhand der Marke und der Regional su welcher der Kunde diese schreib sollen, alle Geschäftspartner, welche aus einem umkreis kommen, soll er Kunde selber definieren können, ob aus der Nähe und wie weit, die Anfrage automatisch eitergeleitet bekommen, jedoch sollen die Geschäftspartner folgende Daten aus der Anfrage nicht sehen können: Vorname, Nachname, Mailadresse, Telefonnummer, Adresse vom Kunden, Sie sollen nur die Postleitzahl sehen können von en persönlichen Daten es Kunden, natürlich sollen Sie alle Informationen zur er Anfrage sonst einsehen können. Wie erhaltend ie Anfrage mit allen Kundendaten, diese wird anhand der Marke allen Geschäftspartner automatsich weitergeleitet, damit sie ein Angebot erstellen und kalkulieren können. Sie haben dafür maximal 24h Zeit, jedoch Samstag und Sonntag zählen nicht mit. Somit gilt nur die Anfragezeit Montag bis Freitag von 0:00 Uhr bis 24:00 Uhr. 

Die Angebote werden vom System gesammelt und aufgearbeitet. Nach den 24h werden alle Angeboten Elche von en Geschäftspartnern zu dieser Anfrage bei uns eingereicht worden sind automatisch sortiert, ausgewertet und das beste Angebot, von der Qualität und Qualität wird dem Kunden anonym oder die Firmendaten voM Geschäftspartner zur Verfügung gestellt in seinem Kundenkonto er kann sich dieses anschauen und wenn es Ihm gefällt, kann er auf eine Button klicken, mit „Interessiert mich“ dann bekommt der Geschäftspartner von dem dieses Angebot ist automatisch die Kontaktdaten vom Kunden zugeschickt und die Anfrage wird damit als Abgeschlossen gesetzt und dem Geschäftspartner in Rechnung gestellt. (Der Rechnungsprozess komm ich später zu) 

Beachten:  Im Backround soll unter dem Punkt: Protokoll ein dauerhaftes Protokoll geschrieben werden, was, wer, wann macht iM System und für 30 Tage archiviert werden. Dieser Bereich kann nur vom Admin eingesehen werden und wird nochmals mit einem zusätzlichen Passwort geschützt. Dass Passwort: [entfernt]

Egal wär eine Änderung vornimmt, es gilt immer, dass ich Backround ein Protokoll geschrieben und archiviert wird. 

Rollen: 
Admin
Geschäftsführung
Teamleitung
Vertrieb 
Buchhaltung

  Genaue Darstellung des internen Dashboards, es gibt die folgenden Bereiche: 
Anfragen 
Buchhaltung
Geschäftspartner 
Statistik
Support
Backup 
Verwaltung  News

Nicht alle Seiten sollen von jedem Mitarbeiter einsehbar sein, daher gibt es unterschiedlichen Rollen, welche wie folgt lauten:   Admin = hat alle Berechtigungen kann alles sehen und verwalten, so wie Veränderungen und Anpassungen vornehmen, Löschungen von Anfragen, Nutzerkonten, sowie Zugänge für Mitarbeiter sperren und Geschäftspartnern. er Admin soll die Möglichkeit haben auch einzelne Mitarbeitern sondern Berechtigungen einzuräumen, auf den Mitarbeiter individuell konfiguriert, sprich jeder Mitarbeiter bekommt bei Mitarbeiteranlage eine Rolle zugewiesen, dieses kann auch die Geschäftsführung, jedoch die individuelle Anpassung einer Rolle, kann nur der Admin, dass ein Mitarbeiter einzelnen Sonderrechte bekommt, welche nicht für die reguläre Rolle vorgesehen sind. Er kann Sie jederzeit auch wieder entfernen.

Geschäftsführung = kann alle Seiten einsehen, alle Einstellungen vornehmen, jedoch keine Passwörter von Admin’s zurücksetzen, verändern oder Login-Daten von Admins löschen oder verändern, sowie Konten von Mitarbeiter sperren ist nicht möglich, ebenfalls kann er die Anfragen nicht löschen. Die Einstellungen der Rollen und deren Berechtigungen kann die Rolle ebenfalls nicht vornehmen. Er kann Mitarbeiter anlegen und Ihnen vorraffinierte Rollen zuordnen, jedoch keine Admin rolle, keine Geschäftsführerrolle. 

Teamleitung = Kann Mitarbeiter anlegen und Ihnen eine Rolle als Vertrieb zuordnen, die Freigabe erfolgt automatisch durch das System, die Rolle Teamleitung kann auch Kleien Auswertungen einsehen von einen Mitarbeitern, wie die Performance ist und wie schnell Sie anfangen bearbeiten. Ebenfalls soll er natürlich Anfragen bearbeiten können und manuell einem Geschäftspartner zuordnen können, sowie überwachen ob diese richtig an den Geschäftspartner zugeordnet sind, ggf. manuell ein Geschäftspartner die Anfrage zuordnen und den Partner auch nochmal eine Notiz dazu erstellen und die Anfrage anmahnen, sollte sie noch nicht bearbeitet sein. 

Vertrieb = Die Rolle kümmert sich darum, dass alle Anfragen bearbeitet werden, wenn nachfolgende Notizen unter Sonstiges von den Kunden zu den Anfragen eingehen, dass diese berücksichtigt werden, er bearbeitet Support-Anfragen welche von Kunden oder Geschäftspartnern eingehen.  Er sieht auch von wo die Anfragen kommen und kann gezielt dem Kunden oder der Geschäftspartner eine Nachricht zu dieser Anfrage zukommen lassen. 
Er sieht, ob eine anfrage vom Kunden angenommen wurde und ob diese bereits an den Geschäftspartner versendet wurde oder nicht, kann diese ggf. nochmal an den Geschäftspartner senden, diesen auch anmahnen, hat zusätzlich die Funktion über ein Button, dem Geschäftspartner die Info zuschicken, dass der Kunde an einer Probefahrt interessiert ist mit so einem Fahrzeug. Er sieht an welche Geschäftspartner die Anfrage vom künden rausging und kann an alle oder an einzelnen Partner eine Notiz, Ergänzung oder sonstige Information schicken, sowie die Anfrage der Probefahrt. Er kann eine Anfrage als Spam melden und diese wird dann an die Teamleitung versendet zur Prüfung, wenn die Teamleitung diese als Spam bestätigt, dann wird sie gelöscht und deaktiviert. Dann läuft Sie beim Admin im Support Bereich auf, als neue Supportanfarge, wo der Fall dann nochmal geprüft wird. 

Buchhaltung = Die Buchhaltung kann den Bereich Buchhaltung bedienen 

Selbstverständlich können die übergeordneten Rollen die Funktionen der untergeordneten Rollen ebenfalls ausführen / durchführen.  
 Buchhaltung  = Die Rolle erhält in Ihrem Dashboard eine Übersicht, von Anfragen, welche erfolgreich an unsere Geschäftspartner übermittelt worden und ein Geschäftspartner den Zuschlage erhalten hat.  Also wenn ein Kunde ein Angebot eines Geschäftspartner angenommen hat und die Lead Daten erfolgreich übermittelt worden. Dann duscht die Anfrage vom Anfragetool als Erledigt raus und geht in das Dashboard der Buchhaltung, wo die Anfrage nochmal erscheint mit den Daten vom künden, der Anfrage selber und die Daten des Geschäftspartner, welcher den Zuschlage erhalten hat. Jeder Geschäftspartner ist mit seinen Adressdaten, USt-Nr und Rechnungsanschrift, s sowie Mailadresse für die Rechnungsversand hinterlegt. 

Die Rolle Buchhaltung kann dann sich en Fall ggf. anschauen, nochmal eine Notiz zu setzen. Dann bekommt Sie die Möglichkeit dem Geschäftspartner eine Rechnung zu schrieben, dafür soll ein Button erstellt werden „Rechnung versenden“ dann soll automatisch an den Geschäftspartner eine Rechnung zu diesem Falle erstellt werden und an die Mailadresse versendet werden, wo der Geschäftspartner drauf hinterlegt ist. 
 Zudem soll die Rolle eine Übersicht haben, welche Rechnungen versendet wurden, diese soll auch Filtermöglichkeiten haben, nach Rechnungsnummern zu suchen, nach Erstelldatum zu sortieren, nach Rechnungsempfänger zu sortieren oder auch zu suchen, sowie die Rechnung einzusehen. Ebenfalls soll Sie Rechnungen anmahnen dürfen, mit dem Button „Mahnung“, dann wird eine erste freundliche Zahlungserinnerung zu der Rechnung automatisch an den die Rechnungsmail des Geschäftspartner versendet, sowie ein Information in dem Feld „News“ beim Geschäftspartner gesetzt. („NEWS“ wird später definiert) Ab der zweiteN Mahnung wird eine Gebühr in Höhe von (Manuell in den Einstellung einstellbar bei er Buchhaltung) erhoben.  Das Zahlungsziel der Rechnungen sind immer 14 Tage.  Die Anfragenummer soll immer mit im Rechnungstext aufgeführt werden.  EiN Geschäftspartner soll die Möglichkeit haben, monatlich die Rechnung zu bezahlen und nicht jede einzelne, dann wird beiM Rechnungsversand, die Rechnung in eine Zwischenablage gesammelt und eine Gesamtrechnung immer am Monatsende versendet, was automatisch passiert, mit allen gewonnen Fällen, die auf Rechnung stehen. Das Zahlungszeil von 14 Tagen beginnt dann erst. 
Die Einstellungen, ob eiN Geschäftspartner jeden Fall einzeln zahlen möchte oder monatlich, kann bei Anlage eines Geschäftspartners eingestellt werden von den Rollen; Geschäftsführung und Admin oder später auch in den Einstellung angepasst werden, dann erfolgt eine Randnotiz, wann dieses geändert wurde und steht in dem Kundenprofil unten drunter als Notiz, welche nur für den Admin einsehbar sind.   Außerdem soll die Buchhaltung ein komplettes Buchhalterischessystem bekommen, worüber Sie Eingangs- & Ausgangsrechnugn einsehen, verwalten, anmahnen und erstellen kann. Sowie Lieferantenkonten anlegen kann und Zahlungseinstellungen kann, welche mit Endes des Tages auf einer Liste aufgeführt werden, damit sie von der Geschäftsführung ausgelöst und im Banksystem eingelesen werden können.  Der Tagesabschluss soll vom Admin manuell festgelegt werden können.   
Die Seiten im internen Board enthalten folgendes:  
Anfragen: Es laufen alle Anfragen ein, welche von Kunden aus dem Anfragetool Traumwagen-Deal und vom Verkaufe dein Fahrzeuges versendet werden. Es werden alle Anfargen darüber verwaltet automatisch an die Geschäftspartner versendet und die Angebote zu den Anfragen eingeholt. Die Komplette Anfragen, Angebotssteuerung läuft darüber. 
 Die Anfragen sollen fortlaufend nummeriert werden wie bereits hinterlegt. Zudem sollen Sie Filter und sortierbar sein, ebenfalls soll man nach Anfragenummern, Kundennamen, Mailadressen, Anfragedatum suchen und filtern können, sowie nach Marke, Modell und Status der Anfrage.   In dem Board soll die Reihenfolge einer einzelnen Anfrage der Spalten ie folgt sein:   Anfragenummer, Anfragedatum, Bearbeitungsstatus, Anliegen, Kunde, Marke, Model, Budget, Zuständiger interner Mitarbeiter, Rückmeldungsstatus von Geschäftspartnern, wie viele Angebote einging und wann,   Es gibt folgende Statusmeldung im System: 

Eingang 
in Bearbeitung  aut. Versendet
Angebot liegt vor
Angebot in Bearbeitung 
Angebot beim Kunden 
Angebot abgelehnt oder Angebot akzeptiert
Kontaktdaten versendet 
Fehler (bei fehlerhafter Anfrage)
Störung (bei fehlerhafter Versendung an Geschäftspartner oder an Kunde)  
 Buchhaltung Das komplette Buchhalterische_System, welches sich um den Versand von Rechnungen an die Geschäftspartner kümmert, Zahlungserinnerung auslöst und Mahnungen schriebt, sowie die Eingänge verwaltet, Zahlungseingänge auch manuelle Auswahl der Mitarbeiter dokumentiert, ob eine Rechnung bezahlt / offen, oder angemahnt ist, ob eine Mahnung bezahlt wurde, etc.   Genau so sollen die Mitarbeiter mit der Rolle „Buchhaltung“, „Admin“ und „Geschäftsführung“ alle Rechnungen und Mahnungen, sowie Zahlungserinnerungen einsehen und verwalten können. 

Der „Admin“ und die „Geschäftsführung“ kann ebenfalls zentral für alle Kunde das Zahlungsziel festsetzen und die Mahngebühren, sowie die Zahlungsbedingungen verwalten, sie können aber auch als einzige Rollen die Mahngebühren und Zahlungsziel bei jedem einzelne Geschäftspartner auf den Gesähäftspartnerkonten manuell anpassen und speichern.   Ergänze gerne das Tool um notwendige Eigenschaften, welche du für erforderlich hältst. 


Geschäftspartner Darüber können Geschäftspartner angelegt werden. Diese unterscheiden sich in einzelne Geschäftspartner oder Organisationen. 
Einzelne Geschäftspartner sind einzelne Konten, welche für sich agieren und meist nur aus einer Person bestehen / aus einem Geschäftskonto. 
Bei Organisationen legen wir ein Geschäftskonto an, was ein Unternehmen ist, wo viele Unterkonto existieren. Sprich ein Geschäftspartner mit mehren Angestellten, welche aber für die gleiche Firma und auf gleiche Rechnung arbeiten, aber einzelne Zugänge bekommen und quasi ein eigenes Dashboard haben. 
Diese laufen als Organisation, worin mehre Geschäftspartner gruppiert wird. Dafür gibt es bei den Geschäftspartnern unterschiedliche rollen, welche später definiert werden. 

Dort können ebenfalls unterschiedliche Einstellungen von den Rollen „Geschäftsführung“ und „Admin“ vorgenommen werden. 

Ebenfalls  wird darüber ein Geschäftspartner Konto angelegt und eröffnet. Wenn Das Geschäftspartnerkonto angelegt ist, kann man auf einen Button klicken, welcher an die hinterlegte Mailadresse des Geschäftspartners ein Einladungs,mail schickt, welche ein link enthält, wo der der Geschäftspartner sich in Passwort überlegen und erstmalig erstellen kann. (Nur der „Admin“ der KFL GbR hat die Möglichkeit die Passwörter zurückzusetzen und dem Geschäftspartner ein Link zukommen zu lassen, dass er sich ein neues Passort erstellen kann oder dieses auf ein Standard Passwort zurücksetzen kann und dem Geschäftspartner dann per Button und Mail zukommen lässt, dann wird der „Admin“ aufgefordert vor dem Versand ein manuelles Standardpasswort zu erstellen und auf Senden zu klicken. 
  Ebenfalls sehen die rollen „ Geschäftsführung“ und „Admin“ wie die Statistik zu dem einzelnen Geschäftspartner ist, wie stark sie Angebote zukommen lassen, wie viele Zusagen oder Absagen Sie bekommen, wie gut die Kundenumfragen nach den Zusagen sind und wie viele aktive und inaktive Konten sie haben. Wie sie auf Anfragen von unserem Support reagieren und wie sie performen. 

Dieses läuft auch in die gesamte Statistik mit ein, welche die Rolle „Geschäftsführung“ und „Admin“ einsehen können. 

Ebenfalls kann man bei dem Geschäftspartner die unterschiedlichen Ansprechpartner noch hinterlegen, wie Geschäftsführung, Konzernleitung, Buchhaltung, IT, welche keine eigenes Geschäftspartnerkonto ind er Organisation haben. 

Ebenfalls sehe ich bei jedem einzelnen Geschäftspartner, auch in der Organisation, ob Sie die Datenschutzeinwilligung, AGBS, akzeptiert haben, ob Sie an der Erstschulung teilgenommen haben, (Der Schulungsbereich folgt später per Update) Der Schulungsbutton wird manuell angekreuzt von er KFL GbR. 

Bei jedem Geschäftspartner werden Öffnungszeiten für jeden Tag in der Woche hinterlegt, da diese dann für den zeitlichenA Ablauf der Anfragen als Zeitbemessung genutzt werden. Damit soll errechnet werden ob Samstag die Zeit mit läuft oder nicht.


Statistik 
In die Statistik hat nur „Geschäftsführung“ und „Admin“ Zugriff, dort werden alle Anfragen, Angebote, Performance der Mitarbeiter, Performance der Geschäftspartner, sowie offene Rechnungen, Rechnungssummen, erwirtschafte Umsätze, Ausgaben, Kosten, Einnahmen, gewinne, Kulanzen, Mahnungen, neu Anlagen von Geschäftspartnern, Marketingstrategien und alle weiteren relevante Zahlen ausgewertet, verglichen mit dem letzten Jahr, mit dem letzten Monat, mit dem letzten tag, es wird eine kalkulierte Vorrausschau erstellt, kalkuliert auf Basis der letzten 30 Tage und dem letzten Jahr, dieses kann durch Filtern manuell voM „Admin“ angepasst werden. 

Ebenfalls werte bitte über eine zweite Seite der Statistik die Statistik vom Webstore auf shopify aus. Der Webseite: www.kfl-group.com


Support
Im support Bereich sollen alle Anfragen einlaufen, welche von der Webseite über den Bereich der Support geschrieben werden. Diese werden mit dem Tag „Webseite“ markiert, dann sollen da alle Anfragen von Mitarbeiter der KFL GbR einlaufen, die ein technisches Problem haben mit dem Tag „Intern“, dann sollen dort alle Support Anfragen einlaufen voN Geschäftspartnern mit dem Tag „Partner“.  
Die Anfragen sollen vom Supportteam in Prioritäten sortiert werden können und auch in den Status Bearbeitung gesetzt werden können und auf erledigt, wenn Sie erledigt sind, werden Sie automatisch für 10 Tage archiviert im Support-Bereich, danach laufen Sie in das Backround Archiv im Bereich „Backup“, die Einstellung nach wie vielen Tagen die archivierten Anfragen in „Backup“ laufen, soll vom „Admin“ eingestellt werden können unter den Einstellungen. 

Die Supportanfragen, sind 24h lang auf normaler Priorität, danach werden Sie automatische erhöht auf Hohe Prioriuät, außer sie sind bereist in Bearbeitung.  Jeder der eine Anfrage an das Support Team schniebt erhält eine offizielle Mail von er KFL GbR, dass seine Antrag beim Support eingenagte ist und das wir uns schnellstmöglich darum kümmern. Den Text kannst du indivudell erstellen und anpassen. Die Mail wird von der Mailadresse: „noreplay@kfl-group.com“ versandt. 

Im Suppor-Bereich soll es eine Liste gebend welcher nur der „Admin“ sieht, da kann er ein neues Feld mit einem Fehler voM System erstellen, dazu auch Notizen schrieben und auch wieder auf erledigt setzen. 
Nachdem es erledigt ist, wird es archiviert im Backup für 365 Tage, danach wird es am 366 Tag beim nächsten backup nicht mehr archiviert und in den folgenden. 


Backup
Das Backup ist nur für den „Admin“ einsehbar und ist Passwortgeschützt mit dem Passwort: [entfernt]
Im backup werden sämtliche Handlungen, jede Änderung, jeder Datensatz erfasst und archiviert als Textdatei. Jeden Tag um 0:01 Uhr wird ein Backup vom System und vom System Code erstellt und gespeichert. 
Dieses Backup soll in eine Cloud hochgeladen werden. Diese möchte ich später noch bestimmen können.  Alternativ soll das Backup als Text Datei geschrieben und immer dann sl Download mir zur Verfügung gestellt werden.   Dieses Backup soll technische Lücken aufzeigen und evtl. Hacking vermeiden und eindämmen. (Als Sicherheitsupdate und Backup funktionieren.   Das backup wird immer verschlüsselt mit einem Passwort, dass Passwort dafür wird vom „Admin“ festgelegt und kann nur durch den „Admin“ geändert werden. 


Verwaltung
Können die Rollen „Geschäftsführung“ und „admin“ die Mitarbeiter der KFL GbR anlegen und verwalten, Ihnen unterschiedliche Rollen und Berechtigungen zuordnen. zudem können über diesen Bereich die Nutzer gesperrt, Rollen angepasst und individuell verändert werden. Sowie die Einstellungen für die Mitarbeiter vornehmen. Alle Einstellungen der Mitarbeieterkonten vornehmen und anpassen    Ebenfalls soll dort bitte der allgemeine Link hinterlegt werden für die Startseite des Dashboard, so dass man diesen an neue Mitarbeiter auch versenden kann.  Ebenfalls soll da die Startseite des Dashboard für den Shopify_Store hinterlegt, dieser ist nur für den „Admin“ und „Geschäftsführung“ einsehbar. 
Zudem soll der Link der Startseite von dem Dashboard der Geschäftspartner dort hinterlegt werden, so dass dieser ggf. nochmal versendet werden kann an eine beliebige Mailadresse. 


News
Bei News werden alle neuen informationen, welche die verschiedene Rollen erstellt werden, die für alle Mitarbeiter gelten veröffentlich, sowie wichtige Informationen, Änderungen darüber Informiert. Zudem werden darüber auch alle Mitarbeiter informiert, was wichtig für Ihren Fachbereich ist. 

„Admin“, „Geschäftsführung“ haben da die Möglichkeit nachrichten und Informationen zur erstellen und allen zukommen zu lassen oder nur einzelnen Rollen oder Abteilungen. 

Genau so werden dort alle neuen Nachrichten, Anfragen; support-anfragen und sonstiges angezeigten Elche neu im System einlaufen und je nach Fachbereich dort angezeigt, je nach Rolle der Mitarbeiters. 

Ebenfalls kann „Geschäftsführung“, „Admin“ Nachrichten an Geschäftspartner versenden, einzelne oder auch ganze Organisationen oder alle Geschäftspartner, die zu einer bestimmten Marke gehören. 


Ebenfalls richte dort für jeden Mitarbeiter eine Art chat Möglichkeit ein, wo die Mitarbeiter mit einem anderen Mitarbeiter chatten können, sprich Nachrichten untereinander versenden können, wie bei einem Message Dienst, sie den einzelnen Mitarbeiter auswählen können, wem Sie eine Nachricht schrieben können und diese dann bei dem Mitarbeiter auch nur in seinem News Bereich auftaucht und er auch wenn er auf die Nachricht klickt, auf diese antworten kann. Wie ein Chat. 

Jeder Mitarbeiter soll auf seinen Dashboard Startseite ein großes News Fenster haben und die Nachrichten auch anteilig direkt einsehen können, wie ein Message-Dienst. 

Sie auf gelesen oder ungelesen setzen können und darauf antworten können, bis auf auf Nachrichten die als Allgemeinen Message von der „Geschäftsführung“ und „Admin“ geschrieben werden. Die Mitarbeiter sollen nur die Möglichkeit haben auf Nachrichten zu antworten und mehrere Chats zu haben mit Einem direkten Mitarbeiter. Es soll ich Gruppenchat Funktion geben, dann kann ein Mitarbeiter die Mitarbeiter anschreiben, die die gleiche rolle haben. Der Mitarbeiter kann aber manuell auswählen, wen er alles in der Gruppe anschrieb möchte. 
 Wenn ein Mitarbeiter ein Supportanfrage geschrieben hat und der Support drauf antwortet, erscheint die Antwort auch in dem News des Mitarbeiters oder auch es Geschäftspartners, je nachdem wer die Anfrage geschrieben hat.


Von Elchen Mailadressen erden welche Nachrichten versendet: 

rechnung@kfl-group.com = Alle Rechnungen, Mahnungen und Sonstige Schreiben, welche von der „Buchhaltung“ versendet werden.

noreplay@kfl-group.com = alle Nachrichten, welche durch das Systeme erstellt werden zur Einladung und Konto Erstellung, sowie sämtliche Nachrichten voM System, die nicht von einer anderen Mailadresse versendet werden und an Kunden oder Geschäftspartner rausgehen

vermittlung@kfl-group.com = alle nachrichten, welche an Geschäftspartner rausgehen von dem Anfragetool 

support@kfl-group.com = alle Nachrichten, welche Vom Support an die Geschäftspartner rausgehen und an Kunden



Das Dashboard der Geschäftspartner 

Das Dashboard für Geschäftspartner ist nur einsehbar, die ein Konto bei uns als Geschäftspartner haben. Sie sollen ebenfalls eine Login Seite bekommen, wie die Mitarbeiter der KFL GbR für Ihr Dashboard. 
Jedoch soll Adas Dashboard für die Geschäftspartner ein modernes Design haben und es muss für Mobilgeräte tauglich sein. Spricht die Bedienung muss ohne Probleme über Handy oder einer mobilen Version funktionieren. 
Außerdem soll die Login-Seite sehr modern gestaltet werden und sehr ansprechend sein. Ähnlich wie die Startseite der Webseite www.kfl-group.com in dem neuen Design. Außerdem soll die Login_Seite motivieren und die Geschäftspartner zu Top Leistungen anspornen. Dort soll auch nochmal ein kleine Verlinkung unserer Social Media Kanäle sein. Aktuell unser Webstore und Instagram. 

Wenn der Geschäftspartner sich eingeloggt hat mit seiner Mailadresse und Passwort, soll er ein modernes und übersichtliches Dashboard finden, was Ihm alle neuen Anfragen aufzeigt, alle wichtigen News anzeigt und alle von ihm bereits beantwortet oder in Bearbeitung sich befinden Anfragen zeigt. Es soll Ihm eine kleine Auswertung aufzeigen, wie er bisher gearbeitet hat und wie viele erfolgreiche Geschäfte er bereits gemeldet hat. 

Zudem soll das Dashboard die Rolle „Vertreiber“ stark motivieren und mehr von Ihm fordern, dass er noch mehr Anfragen bearbeitet, sofern möglich.  Es soll Ihm anbieten, sich ein eignes kleines Infofeld anzulegen, wo er sich, wenn er mag für einen bestimmten Kalendertag oder für immer Notizen zu machen, die Ihm immer nagezeigt werden oder nur an dem Kalendertag. Ebenfalls soll er das Tagesdatum sehen und die aktuelle KW Woche und das Jahr. 

Über das News Feld sieht er dann auch die neuen Anfragen, News von er KFL, welche an Ihn als Nutzer, die Marke oder die Organisation ging. Außerdem alle neu eingegangen Anfragen welche noch nicht bearbeitet sind, und alle wichtigen neuen Informationen die seit seiner letzten Anmeldung reingekommen sind. 
 Es sollen folgende Seiten geben:  Anfragen 
Angebote 
News
Einstellungen
Support
Statistik  diese ist nur für die Rolle „Geschäftsführer“ und  eingeschränkt für die „Verkaufsleitung“ sichtbar

Es soll die Rollen bei den Geschäftspartner wie folgt geben:   Geschäftsführer
Verkaufsleitung
Vertriebler

Den Bereich Einstellungen und Support, soll jede Rolle bei en Geschäftspartner bekommen. Die Support Antworten von dem KFL GbR Team soll der jeweiligen Nutzer in seinen News sehen und auf die Nachricht vom Support auch in dem Bereich als Support sehen dune ebenfalls darauf antworten können. Ähnlich wie eine Kommentar Funktion oder Nachrichtenfunktion. Schließen einer Supportanfragen kann nur das Supportteam der KFL GbR


Die Rollen sollen folgendes können jeweils, die übergeordnete Rolle kann immer das, was die rolle darunter auch kann und zusätzlich folgendes: 

Vertriebler
Dieser kann alle Anfragen einsehen, welche an ihn direkt über das Dashboard der Kfz GbR an Ihn zugestellt worden sind, oder durch die automatische Zuordnung vom System, so lang die Anfrage offen in seiner Organisation ist und noch von keinem in den Status Bearbeitung gesetzt wurde. Sobald die Anfrage in Bearbeitung steht, kann nur der „Vertriebler die Anfrage sehen, welcher die Anfrage in seiner Organisation in „ Bearbeitung“ gesetzt hat. Die Verkaufsleitung kann nur die Anfrage sehen und wer sie aus seiner Organisation in Bearbeitung hat. Er sieht nicht mehr, was genauer in der Anfrage war und was für ein Angebot der „Vertriebler“ dort hochgeladen hat, bzw. welches Angebot er abgeben hat. 

Jeder Geschäftspartner kann die Anfrage einzeln bearbeiten, doch je Organisation kann nur ein Nutzer die Anfrage bearbeiten und sieht nicht, welcher andere Geschäftspartner die Anfrage noch bekommen hat und ob dieser ein Angebot abgeben hat und wenn welches er abgeben hat. 

In der Anfrage wird die Postleitzahl nur vom Kunden mit aufgeführt, wwelcher die Anfrage versendet hat, dahinter soll eine Kilometerangabe stehen, wie weit lauft Luftlinie der Kunde von Ihm entfernt ist. 
 Der Vertriebler soll die Möglichkeit haben, bis er die Anfrage in Bearbeitung setzt, nur einsehen zu könne, handelt es sich um ein Neuwagen oder Gebrauchtwagen, die Entfernung (Postleitzahl) und ob er die Anfrage übernehmen möchte. 
Wenn er die Anfrage übernimmt, geht Sie automatisch in den Status Bearbeitung. Dann kann er alle Informationen einsehen und die Anfrage bearbeiten. Er kann ein Angebot erstellen in dem Er die Eckdaten eingibt manuell. 
Marke und Model sind bereits ausgefüllt, wenn ein Neuwagen, dann selbe Konfiguration auswählen anklicken oder alternative Konfiguration, dann kann er den Herstellercode dort hinterlegen oder ein Exposee als PDF hochladen.  Das Angebot kann er als Pdf hochladen oder kann es manuell eingeben, den Kaufpreis bei Auswahl kauf, bei Leasing muss er die Kilometerleistung bestätigen die der Kunde ausgewählt hat oder eine alternative angeben, die Laufzeit bestätigen oder eine alternative eingeben, die Überführung und Zulassungskosten angeben, sofern er Kunde ausgewählt hat die Kosten für die Servciepaket oder und Versicherung angeben, sowie die monatliche Rate mit angeben für das Fahrzeug ohne Servicekosten oder der Gleichen. Bei Privat Kunden brutto, bei gewerblichen Kunden netto, bei einer Finanzierungsanfarge sind die Zahlen immer brutto und er Muss den Kaufpreis, sowie die Schlussrate mitangeben. 

Sollte der Geschäftspartner das Angebot per PDF hochladen, dann soll das System die Eckdaten, wie oben manuell auszufüllen aus dem Angebot,w ein möglich raussuchen und ausfüllen im Nachgang im backround.  (Wenn nicht möglich, dann soll das System von der PDF nur alle Informationen entfernen, die auf den Geschäftspartner hindeuten könnten, wie Anschrift vom Geschäftspartner, Ansprechpartner oder ein logo.) Damit kann es dem Kunden neutral vorgestellt werden. Das gleiche soll das System auch bei einem Exposee machen. 

Bez Gebrauchtwagen kann der Geschäftspartner noch zusätzliche Angeben machen, wie Erstzulassung, Fahrleistung, sofern vorhanden den UPE (Herstellerlistenpreis) ob unfallfrei und wie viele Vorbesitzer.  Die Option anbieten, den Hacken zu setzen, entspricht der Ausstattung wie vom Kunden angefragt. Bitte an markieren und ein Ja oder nein abfragen. 
 Wenn er auf „Angebot senden“ klickt, geht die Anfrage automatisch auf „Versendet“ und die Anfrage wird automatisch bei Ihm in die spalte rutschen, beantwortet und auf Rückmeldung warten. 
 Wenn das System seien Anfrage dem künden nicht als Option vorschlägt, dann geht die Anfrage automatisch auf „Geschlossen“ und eine Information wird platziert, weshalb geschlossen, sofern vom System hinterlegt. 
Ist er Status rot geschlossen, wird die Anfrage gelb und archiviert sich und verschwindet auf der Ansicht des „Vertreiber“  Das Angebot wird dem Kunden angezeigt und vorgestellt als Option, rutscht der Status auf „Vorgestellt“ und die Anfrage wird hell grün.  Dann wird die Anfrage auf eine separate Liste eistest und in die News des Nutzer gelegt als Information. (Positive Bestärkung für den Nutzer.) 
Wenn der Kunde das Angebot bestätigt und auf „Interessiert mich“ klickt, ändert sich der Status der Anfrage auf „Gewonnen“ und wird grün beiM vertriebelr, er bekommt eine gesonderte Nachricht per Mail von der Mailadresse: 
vermittlung@kfl-group.com und erhält im System bei der Anfrage die Kontaktinformationen vom Kunden, wie den vollständigen Namen, Anschrift, Mailadresse und Telefonnummer
 Per Maile erhält er die Information, dass er er Angebot gewonnen hat und ein Kunde auf seine. Anruf oder Mail wartet. Er kann einen Vertrag generieren. 

Mit dem Status „Gewonnen“ geht bei er KFL GbR im Dashboard die Anfrage in die Buchhaltung zur Berechnung. Nur mit dem Status gewonnen!

Dann startet bei dem veritabler eine StoppUhr, welche 24h lang läuft, in dieser Zeit soll er den künden erreicht haben und mit Ihm ein Termin oder der Gleichen vereinbart haben.  (Die Zeit läuft nur an Werkstagen Montag bis Freitag. Samstag nur, wenn dieses in den Einstellung bei dem Geschäftspartner os hinterlegt wurde. 

Wenn er den künden telefonisch kontaktiert hat oder per Mail und der Kunde reagiert, dann muss er die Anfrage von „Gewonnen“ auf Kunden erfolgreich kontaktiert“ setzten, wenn er den Kunden nach mehrfachen versuchen innerhalb der 24 Stunden nicht erreicht, dann soll er den Staus „Gewonnen“ auf „Kunden nicht erreicht“ setzen und das System er KFL GbR wird den künden nochmal anschrieben und nachfassen, ob das Autohaus sich bei Ihm gemeldet hat. Darauf kann der Kunde per Klick „ja“ oder „nein“ in der Mail reagieren und das Feedback in das Team  der KLF GbR „ Vertrieb“ einspielen, dann kontaktieren diese nochmal das Autohaus und können die Meldung der Anfrage auf „Gewonnen“ nochmal setzen, müssen dann eine Notiz schrieben, welche auch der Geschäftspartner sieht, was der Kunde gesagt hat und der Geschäftspartner kann den Kunden nochmal anrufen oder anschrieben.   Sollte der Kunde auf „Nein“ klicken, wird der die Anfrage ins Team „Vertrieb“ gespielt und das Team wird den Geschäftspartner kontaktieren und nachfassen, wieso der Kunde nicht kontiert wurde und kann den Status der Anfrage dann manuell nochmal ändern in „Gewonnen“, „Verloren“, „Verhandlung gescheitert“ zu jeder Entscheidung muss eine Begründung / Notiz hinterlegt werden. Sobald die Anfrage einmal auf „Gewonnen“ stand, wird die Anfrage in die Buchhaltung der KLF GbR gesendet, es bleibt eine Kopie im vertrieb die intern auch als „Kopie“ und als „in Rechnung gestellt“ gekennzeichnet wird. 

Wenn die Anfragen nicht innerhalb von 24 Stunden bearbeitet werden, gehen Sie auf den Status „ Verloren“ und werden geschlossen. 

Wenn ein „Vertriebler“ die Anfrage übernimmt und 4 Stunden lang kein Angebot versendet, oder die Anfrage bearbeitet, wird sie wieder gesamten Organisation zur Bearbeitung zur verfügung gestellt und ein anderer „Vertriebler“ kann Sie bearbeiten. Wenn der aktuelle „Vertreiber“ den Staus „wieder öffnen“ auswählt, wird die Anfrage der gesamten Organisation wieder sichtbar geschaltet. (EiN Vermerk als Notiz unten erfolgt wieder und ist wieder von der Geschäftsführung und der Mitarbeiter der KFL GbR einsehbar. Immer mit dem Vermerk: „Vertrauliche Information“.)


Verkaufsleitung
Die Rolle kann zusätzlich noch die Seite „Angebote“ einsehen, wenn Angebote abgeben wurden, wir die Anfrage ebenfalls Alas Kopie in die Seite „ Angebote“ gestellt. Die „Verkaufsletiung“ sieht’s wer die Anfrage aus der Organisation bearbeite hat und wann er das Angebot abgeben hat. Er sieht was für ein Angebot abgeben wurde und kann ggf. die PDF-Dateien einsehen welche hochgeladen worden sind. Wenn er ein Angebot öffnete wird jedes mal ein Kleien Notiz hinterlegt, welches nur der „Geschäftsführer“ einsehen kann und die Mitarbeiter der KFL GbR. (Immer mit dem Vermerk: „Vertrauliche Information“.)

Zudem sieht die Verkaufsleitung ein teil des Dashboards der Statistik, wie viele Anfragen sie erhalten, wie viele bearbeitet werden oder auch nicht, wie viele gewonnen, verloren oder in Bearbeitung sind. 
Ebenfalls sieht er auch, um welche Modelle es sich hauptsächlich handelte und welche Marken, diese Statistik kann er auch für sich nach den einzelnen Spalten filtern. 

Er hat ebenfalls eine News Seite, welche genau so funktionierte  nur noch die zusätzlichen Funktionen der jeweiligen Rolle hinzukommen. 


 Geschäftsführung
Die Rolle kann alle Funktionen, wie die beiden zuvor auch, hat nur noch die Möglichkeit, Support Tickets zu schrieben, welche mit der Priorität „HOCH“ automatische eingestuft werden und somit im Support Bereich immer ganz oben stehen. 

Außerdem kann die Geschäftsführung die Öffnungszeiten der Organisation anpassen, sieht die seiner Organisation zugeordneten Personen, sowie deren Rollen. Kann die Konten löschen, die rollen verändern. Jedoch werdend diese nicht sofort geändert, sondern auf im Support Team ein mit der Information der Änderung und die können diese mit einem Klick Bestätigen oder Ablesen oder den Geschäftsführer anrufen und nachfragen, ob dieses Änderung Wirkich durchgeführt wurde. 
 Wenn eine Änderung bestätigt wird, bekommt Geschäftsführer, welcher die Änderung beauftragt hat, eine Information dazu in seinem News Feld und per Mail.  Die Mail wird dafür von support@kfl-gorup.com versendet. 

Ebenfalls kann er in den Einstellung bei der Organisation die Rechnungsmail ändern, sowie die Rechnungsanschrift. 

Eine Löschung der Organisation ist nicht möglich. Dafür müsste er den Support anschrieben. Die Löschung einer gesamten Organisation kann nur durch einen „Admin“ der KKFL GbR durchgeführt werden. 

Ebenfalls kann die Geschäftsführung in dem Bereich der Statistik die gleiche Auswertung machen wie die Rolle „Verkaufsleitung“, jedoch sieht die Geschäftsführung noch, wer wie viele Angebote schriebt, wie schnell wer seiner Angestellten reagiert und wie die gesamte Auswertung der Anfragen und Angebote ist. Wie häufig die Angebote angenommen werden oder abgelehnt werden. 

Ebenfalls kann er sich eine Bericht herunterladen der letzten 30 Tage oder 60 Tage, sobald diese zur Verfügung stehen. Für die gesamte Organisation oder auch für einzelne Rollen in seiner Organisation. 



Sonstiges
Bitte stell dem  „Admin“ die Möglichkeit zur Verfügung, in den Einstellungen, alle Einstellungen, welche man für die Dashboards machen kann und mit dem Berechtigung für Alles ändern kann, ändern zu können. 
 Von welchen Mailadressen wie Mails versendet werden, wann was ausgeführt werden soll, wie die Kosten für Mahngebühren sind, wann nach welcher Zeit Mahnungen automatisch versendet werden soll, etc. 

Ebenfalls gebe den einzelnen rollen die Möglichkeit Eintragungen im System zu machen, wanN Sie im urlaub sind oder nicht arbeiten, einen Vertreter aus seinem Team eintragen können, welcher die Arbeiten in der Zeit der Abwesenheit übernimmt. Außerhalb der Arbeitszeiten wird nur eine zusätzliche Ansicht der Vertretenden Rolle gewährt und die Bearbeitung ermöglicht. Es geht nur eine Vertretung mit der gleichen rolle oder einer höheren rolle. 
Beide Mitarbeiter müssend er Vertretung zustimmen: Sie bekommen eine Anfrage in ihren News die sie bestätigen müssen. 