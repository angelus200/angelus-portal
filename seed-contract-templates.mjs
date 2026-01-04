/**
 * Seed-Script: Professionelle Vertragsvorlagen in Datenbank laden
 * Verwendung: node seed-contract-templates.mjs
 */

import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const contractTemplates = [
  {
    name: "Zeichnungsvereinbarung",
    type: "subscription_agreement",
    validFrom: new Date().toISOString().split("T")[0],
    content: `
<h1>ZEICHNUNGSVEREINBARUNG</h1>

<p><strong>zwischen</strong></p>

<p><strong>Angelus Group</strong>, vertreten durch ihre Geschäftsführung,<br>
Adresse: [Angelus Group Adresse]<br>
(nachfolgend „Emittent" genannt)</p>

<p><strong>und</strong></p>

<p>[Investor Name], [Adresse]<br>
(nachfolgend „Zeichner" genannt)</p>

<h2>1. Vertragsgegenstand</h2>

<p>1.1 Der Zeichner erklärt hiermit verbindlich, dass er die nachfolgend beschriebenen Beteiligungspapiere zeichnet und kauft.</p>

<p>1.2 Gegenstand dieser Vereinbarung ist die Zeichnung von [Anzahl] Beteiligungsanteilen der Angelus Group zum Zeichnungspreis von [Betrag] EUR pro Anteil, insgesamt [Gesamtbetrag] EUR.</p>

<p>1.3 Die Beteiligungspapiere werden gemäß den Bedingungen dieser Zeichnungsvereinbarung und den Allgemeinen Geschäftsbedingungen ausgegeben.</p>

<h2>2. Zeichnungsbedingungen</h2>

<p>2.1 Der Zeichner erklärt, dass er volljährig und geschäftsfähig ist.</p>

<p>2.2 Der Zeichner bestätigt, dass er die Risikooffenlegung gelesen und verstanden hat.</p>

<p>2.3 Der Zeichner erklärt, dass er die wirtschaftlichen Verhältnisse dieser Beteiligung versteht und die damit verbundenen Risiken akzeptiert.</p>

<p>2.4 Der Zeichner bestätigt, dass er die erforderlichen Mittel zur Zahlung des Zeichnungspreises zur Verfügung hat.</p>

<p>2.5 Die Zeichnung ist unwiderruflich. Eine Rückgängigmachung ist ausgeschlossen.</p>

<h2>3. Zahlungsbedingungen</h2>

<p>3.1 Der Zeichnungspreis ist innerhalb von [X] Tagen nach Unterzeichnung dieser Vereinbarung auf folgendes Konto zu zahlen:</p>

<p>Kontoinhaber: [Angelus Group]<br>
IBAN: [IBAN]<br>
BIC: [BIC]<br>
Verwendungszweck: Zeichnung [Beteiligungsname]</p>

<p>3.2 Eine Zahlung gilt als geleistet, wenn der Betrag auf dem Konto des Emittenten eingegangen ist.</p>

<p>3.3 Sollte die Zahlung nicht fristgerecht erfolgen, behält sich der Emittent das Recht vor, die Zeichnung zu stornieren.</p>

<h2>4. Beteiligungsrechte und Pflichten</h2>

<p>4.1 Mit der Zahlung des Zeichnungspreises erwirbt der Zeichner die Beteiligungsrechte gemäß den Bedingungen dieser Vereinbarung.</p>

<p>4.2 Der Zeichner hat Anspruch auf anteilige Gewinnbeteiligung nach Maßgabe der Geschäftsbedingungen.</p>

<p>4.3 Der Zeichner verpflichtet sich, die Beteiligungspapiere nicht ohne vorherige schriftliche Zustimmung des Emittenten abzutreten.</p>

<p>4.4 Der Zeichner erklärt sich damit einverstanden, dass seine Beteiligungsdaten in einem Beteiligungsregister erfasst werden.</p>

<h2>5. Laufzeit und Rückzahlung</h2>

<p>5.1 Die Beteiligung hat eine Laufzeit von [X] Monaten ab dem Datum der Kapitalzuführung.</p>

<p>5.2 Die Rückzahlung des Beteiligungskapitals erfolgt am Ende der Laufzeit oder bei vorzeitiger Beendigung nach Maßgabe der Geschäftsbedingungen.</p>

<p>5.3 Der Emittent behält sich das Recht vor, die Laufzeit unter bestimmten Bedingungen zu verlängern oder zu verkürzen.</p>

<h2>6. Risikohinweise</h2>

<p>6.1 Der Zeichner erklärt, dass er die mit dieser Beteiligung verbundenen Risiken versteht und akzeptiert.</p>

<p>6.2 Die Beteiligung ist mit erheblichen Risiken verbunden, einschließlich des Risikos des Totalverlusts des eingesetzten Kapitals.</p>

<p>6.3 Der Zeichner bestätigt, dass er die Risikooffenlegung vollständig gelesen und verstanden hat.</p>

<h2>7. Datenschutz und Compliance</h2>

<p>7.1 Der Zeichner erklärt sich damit einverstanden, dass seine personenbezogenen Daten gemäß der Datenschutzerklärung des Emittenten verarbeitet werden.</p>

<p>7.2 Der Zeichner erklärt, dass er alle erforderlichen KYC- und AML-Überprüfungen durchlaufen hat und diese bestanden hat.</p>

<p>7.3 Der Zeichner verpflichtet sich, den Emittenten unverzüglich über Änderungen seiner persönlichen oder wirtschaftlichen Verhältnisse zu informieren.</p>

<h2>8. Schiedsgerichtsbarkeit</h2>

<p>8.1 Alle Streitigkeiten, die sich aus dieser Vereinbarung oder in Zusammenhang mit dieser Vereinbarung ergeben, werden endgültig durch ein Schiedsverfahren beigelegt.</p>

<p>8.2 Das Schiedsverfahren wird nach den Regeln der Deutschen Institution für Schiedsgerichtsbarkeit (DIS) durchgeführt.</p>

<p>8.3 Das Schiedsverfahren findet in [Ort] statt. Die Verhandlungssprache ist Deutsch.</p>

<p>8.4 Das Schiedsverfahren wird von einem einzelnen Schiedsrichter entschieden, sofern die Parteien nicht etwas anderes vereinbaren.</p>

<p>8.5 Die Kosten des Schiedsverfahrens werden nach Maßgabe der DIS-Regeln verteilt.</p>

<p>8.6 Der Ausschluss des ordentlichen Rechtswegs ist vereinbart. Jede Partei verzichtet auf das Recht, vor einem ordentlichen Gericht Klage zu erheben.</p>

<p>8.7 Die Schiedsspruch ist endgültig und verbindlich und kann nur unter den in den DIS-Regeln vorgesehenen Bedingungen angefochten werden.</p>

<h2>9. Salvatorische Klausel</h2>

<p>9.1 Sollte eine Bestimmung dieser Vereinbarung ganz oder teilweise unwirksam sein, bleibt die Gültigkeit der übrigen Bestimmungen unberührt.</p>

<p>9.2 Die Parteien verpflichten sich, die unwirksame Bestimmung durch eine wirksame Bestimmung zu ersetzen, die dem wirtschaftlichen Zweck der unwirksamen Bestimmung entspricht.</p>

<h2>10. Schlussbestimmungen</h2>

<p>10.1 Diese Vereinbarung unterliegt deutschem Recht, mit Ausnahme der Kollisionsnormen.</p>

<p>10.2 Änderungen und Ergänzungen dieser Vereinbarung bedürfen der Schriftform.</p>

<p>10.3 Diese Vereinbarung stellt die gesamte Vereinbarung zwischen den Parteien dar und ersetzt alle vorherigen Vereinbarungen und Absprachen.</p>

<h2>11. Unterschrift</h2>

<p>Der Zeichner erklärt hiermit, dass er diese Zeichnungsvereinbarung gelesen hat, alle Bedingungen versteht und akzeptiert, und dass er diese Vereinbarung freiwillig unterzeichnet.</p>

<p><strong>Emittent:</strong></p>

<p>_____________________<br>
Angelus Group<br>
Datum: _______________</p>

<p><strong>Zeichner:</strong></p>

<p>_____________________<br>
[Investor Name]<br>
Datum: _______________</p>
    `,
  },
  {
    name: "Risikooffenlegung",
    type: "risk_disclosure",
    validFrom: new Date().toISOString().split("T")[0],
    content: `
<h1>RISIKOOFFENLEGUNG</h1>

<p><strong>Angelus Group Beteiligungspapiere</strong></p>

<h2>Wichtiger Hinweis</h2>

<p>Die nachfolgende Risikooffenlegung informiert Sie über die wesentlichen Risiken, die mit einer Investition in Beteiligungspapiere der Angelus Group verbunden sind. Bitte lesen Sie diese Offenlegung sorgfältig durch, bevor Sie sich zu einer Investition entschließen.</p>

<h2>1. Allgemeine Risikowarnung</h2>

<p>1.1 <strong>Totalverlustrisiko:</strong> Eine Investition in Beteiligungspapiere der Angelus Group ist mit dem Risiko des Totalverlusts des eingesetzten Kapitals verbunden. Sie können Ihre gesamte Investition verlieren.</p>

<p>1.2 <strong>Keine Kapitalgarantie:</strong> Es gibt keine Garantie für die Rückzahlung des Beteiligungskapitals oder die Zahlung von Gewinnen.</p>

<p>1.3 <strong>Keine Einlagensicherung:</strong> Beteiligungspapiere sind nicht durch eine Einlagensicherung geschützt.</p>

<h2>2. Geschäftsrisiken</h2>

<p>2.1 <strong>Unternehmensrisiko:</strong> Der Erfolg der Angelus Group hängt von verschiedenen Faktoren ab, einschließlich der Geschäftsleitung, der Marktbedingungen und der Wettbewerbssituation. Ein Scheitern des Unternehmens könnte zum Totalverlust führen.</p>

<p>2.2 <strong>Marktrisiko:</strong> Die Geschäftstätigkeit der Angelus Group ist anfällig für Veränderungen der Marktbedingungen, einschließlich Konjunkturzyklen, Zinssätze und Wechselkurse.</p>

<p>2.3 <strong>Branchenrisiko:</strong> Die Angelus Group ist in Branchen tätig, die regulatorischen Änderungen, technologischen Disruption und Wettbewerbsdruck unterliegen.</p>

<h2>3. Finanzielle Risiken</h2>

<p>3.1 <strong>Liquiditätsrisiko:</strong> Beteiligungspapiere sind nicht leicht zu verkaufen. Es gibt möglicherweise keinen aktiven Sekundärmarkt für diese Papiere, und Sie könnten Ihre Investition nicht schnell zu einem fairen Preis veräußern.</p>

<p>3.2 <strong>Zinsänderungsrisiko:</strong> Änderungen der Zinssätze können den Wert der Beteiligungspapiere beeinflussen.</p>

<p>3.3 <strong>Kreditrisiko:</strong> Die Angelus Group könnte in finanzielle Schwierigkeiten geraten und ihre Verpflichtungen nicht erfüllen.</p>

<p>3.4 <strong>Fremdwährungsrisiko:</strong> Falls Teile der Geschäftstätigkeit in Fremdwährungen erfolgen, können Wechselkursschwankungen den Wert Ihrer Investition beeinflussen.</p>

<h2>4. Rechtliche und Regulatorische Risiken</h2>

<p>4.1 <strong>Regulatorisches Risiko:</strong> Änderungen in Gesetzen und Vorschriften könnten die Geschäftstätigkeit der Angelus Group beeinträchtigen.</p>

<p>4.2 <strong>Steuerrisiko:</strong> Steuerliche Behandlung von Beteiligungspapieren kann sich ändern, was Ihre Rendite beeinflussen könnte.</p>

<p>4.3 <strong>Rechtsrisiko:</strong> Die Angelus Group könnte in Rechtsstreitigkeiten verwickelt werden, die ihre finanzielle Situation beeinträchtigen.</p>

<h2>5. Operationelle Risiken</h2>

<p>5.1 <strong>Managementrisiko:</strong> Der Erfolg der Angelus Group hängt von der Kompetenz und Integrität ihrer Geschäftsleitung ab.</p>

<p>5.2 <strong>Operationelles Risiko:</strong> Fehler, Betrug oder Systemausfälle könnten zu Verlusten führen.</p>

<p>5.3 <strong>Schlüsselpersonenrisiko:</strong> Der Verlust wichtiger Mitarbeiter könnte die Geschäftstätigkeit beeinträchtigen.</p>

<h2>6. Informationsrisiken</h2>

<p>6.1 <strong>Informationsasymmetrie:</strong> Sie haben möglicherweise nicht vollständigen Zugang zu allen Informationen über die Geschäftstätigkeit der Angelus Group.</p>

<p>6.2 <strong>Offenlegungsrisiko:</strong> Informationen über die Angelus Group könnten unvollständig, ungenau oder veraltet sein.</p>

<h2>7. Spezifische Risiken für Beteiligungspapiere</h2>

<p>7.1 <strong>Verwässerungsrisiko:</strong> Die Angelus Group könnte neue Beteiligungspapiere ausgeben, die Ihren Anteil verwässern.</p>

<p>7.2 <strong>Nachrangiges Risiko:</strong> Beteiligungspapiere können nachrangig gegenüber Schulden der Angelus Group sein.</p>

<p>7.3 <strong>Kündigungsrisiko:</strong> Die Angelus Group könnte die Beteiligungspapiere unter bestimmten Bedingungen kündigen.</p>

<h2>8. Makroökonomische Risiken</h2>

<p>8.1 <strong>Konjunkturrisiko:</strong> Wirtschaftliche Rezessionen oder Stagnation könnten die Geschäftstätigkeit der Angelus Group beeinträchtigen.</p>

<p>8.2 <strong>Inflationsrisiko:</strong> Inflation könnte die Rendite Ihrer Investition verringern.</p>

<p>8.3 <strong>Geopolitisches Risiko:</strong> Politische Instabilität, Kriege oder Terrorismus könnten die Geschäftstätigkeit beeinträchtigen.</p>

<h2>9. Pandemie- und Katastrophenrisiken</h2>

<p>9.1 <strong>Pandemierisiko:</strong> Eine Pandemie oder Epidemie könnte die Geschäftstätigkeit der Angelus Group erheblich beeinträchtigen.</p>

<p>9.2 <strong>Naturkatastrophenrisiko:</strong> Naturkatastrophen könnten zu Schäden an Vermögenswerten oder Betriebsunterbrechungen führen.</p>

<h2>10. Schiedsgerichtsbarkeit und Rechtsbehelf</h2>

<p>10.1 <strong>Schiedsgerichtsrisiko:</strong> Streitigkeiten werden durch Schiedsverfahren beigelegt, nicht durch ordentliche Gerichte. Dies kann Ihre Rechtsmitteloptionen einschränken.</p>

<p>10.2 <strong>Kosten des Schiedsverfahrens:</strong> Schiedsverfahren können teuer sein, und Sie könnten für einen Teil der Kosten aufkommen müssen.</p>

<h2>11. Eignung für Investoren</h2>

<p>11.1 Diese Beteiligungspapiere sind nicht für alle Investoren geeignet. Sie sollten nur von Investoren erworben werden, die:</p>

<ul>
<li>Ein hohes Risikotragfähigkeit haben</li>
<li>Die finanzielle Fähigkeit haben, den Totalverlust ihrer Investition zu verkraften</li>
<li>Langfristige Investitionshorizonte haben</li>
<li>Erfahrung mit Beteiligungsinvestitionen haben</li>
<li>Die Risiken vollständig verstehen und akzeptieren</li>
</ul>

<h2>12. Bestätigung</h2>

<p>12.1 Durch die Unterzeichnung dieser Risikooffenlegung bestätigen Sie, dass Sie:</p>

<ul>
<li>Diese Risikooffenlegung vollständig gelesen und verstanden haben</li>
<li>Die Risiken einer Investition in Beteiligungspapiere der Angelus Group verstehen</li>
<li>Die Risiken akzeptieren und bereit sind, diese einzugehen</li>
<li>Unabhängig finanzielle und rechtliche Beratung eingeholt haben (oder bewusst darauf verzichtet haben)</li>
<li>Diese Investition für Ihre finanzielle Situation geeignet ist</li>
</ul>

<p>Datum: _______________</p>

<p>Unterschrift Investor: _____________________</p>

<p>Name (Druckbuchstaben): _____________________</p>
    `,
  },
  {
    name: "Allgemeine Geschäftsbedingungen (AGB)",
    type: "terms_conditions",
    validFrom: new Date().toISOString().split("T")[0],
    content: `
<h1>ALLGEMEINE GESCHÄFTSBEDINGUNGEN (AGB)</h1>

<p><strong>Angelus Group Beteiligungspapiere</strong></p>

<h2>1. Geltungsbereich</h2>

<p>1.1 Diese AGB gelten für alle Zeichnungen von Beteiligungspapieren der Angelus Group.</p>

<p>1.2 Abweichungen von diesen AGB bedürfen der schriftlichen Zustimmung der Angelus Group.</p>

<h2>2. Definitionen</h2>

<p>2.1 <strong>Beteiligungspapiere:</strong> Wertpapiere, die Beteiligungsrechte an der Angelus Group oder ihren Tochtergesellschaften verbriefen.</p>

<p>2.2 <strong>Zeichner:</strong> Eine natürliche oder juristische Person, die Beteiligungspapiere zeichnet.</p>

<p>2.3 <strong>Emittent:</strong> Die Angelus Group oder eine ihrer Tochtergesellschaften, die die Beteiligungspapiere ausgibt.</p>

<h2>3. Zeichnung und Kauf</h2>

<p>3.1 Die Zeichnung von Beteiligungspapieren erfolgt durch Unterzeichnung einer Zeichnungsvereinbarung.</p>

<p>3.2 Die Zeichnung ist unwiderruflich und verbindlich.</p>

<p>3.3 Der Zeichner erklärt, dass er volljährig und geschäftsfähig ist.</p>

<p>3.4 Der Zeichner erklärt, dass er die erforderlichen Mittel zur Zahlung des Zeichnungspreises hat.</p>

<h2>4. Zahlungsbedingungen</h2>

<p>4.1 Der Zeichnungspreis ist innerhalb der in der Zeichnungsvereinbarung festgelegten Frist zu zahlen.</p>

<p>4.2 Zahlungen müssen auf das von der Angelus Group angegebene Konto erfolgen.</p>

<p>4.3 Eine Zahlung gilt als geleistet, wenn der Betrag auf dem Konto des Emittenten eingegangen ist.</p>

<p>4.4 Verspätete Zahlungen können zur Stornierung der Zeichnung führen.</p>

<h2>5. Beteiligungsrechte</h2>

<p>5.1 Mit der Zahlung des Zeichnungspreises erwirbt der Zeichner die in der Zeichnungsvereinbarung festgelegten Beteiligungsrechte.</p>

<p>5.2 Der Zeichner hat Anspruch auf anteilige Gewinnbeteiligung nach Maßgabe dieser AGB.</p>

<p>5.3 Der Zeichner hat Stimmrechte nach Maßgabe dieser AGB und der Satzung der Angelus Group.</p>

<p>5.4 Der Zeichner hat das Recht, Informationen über die Geschäftstätigkeit der Angelus Group zu erhalten.</p>

<h2>6. Gewinnbeteiligung</h2>

<p>6.1 Der Zeichner hat Anspruch auf anteilige Gewinnbeteiligung nach Maßgabe der Geschäftsergebnisse.</p>

<p>6.2 Gewinne werden nach Abzug aller Kosten und Schulden verteilt.</p>

<p>6.3 Die Angelus Group behält sich das Recht vor, Gewinne zu thesaurieren oder auszuschütten.</p>

<p>6.4 Gewinnausschüttungen erfolgen nach Beschluss der Geschäftsleitung oder des Beirats.</p>

<h2>7. Laufzeit und Rückzahlung</h2>

<p>7.1 Die Beteiligung hat eine Laufzeit von [X] Monaten ab dem Datum der Kapitalzuführung.</p>

<p>7.2 Die Rückzahlung des Beteiligungskapitals erfolgt am Ende der Laufzeit.</p>

<p>7.3 Die Angelus Group behält sich das Recht vor, die Laufzeit unter bestimmten Bedingungen zu verlängern oder zu verkürzen.</p>

<p>7.4 Vorzeitige Rückzahlungen sind ausgeschlossen.</p>

<h2>8. Abtretung und Übertragung</h2>

<p>8.1 Der Zeichner darf die Beteiligungspapiere nicht ohne vorherige schriftliche Zustimmung der Angelus Group abtreten oder übertragen.</p>

<p>8.2 Die Angelus Group kann die Zustimmung nach eigenem Ermessen verweigern.</p>

<p>8.3 Eine Abtretung ohne Zustimmung ist unwirksam.</p>

<h2>9. Beteiligungsregister</h2>

<p>9.1 Die Angelus Group führt ein Beteiligungsregister, in dem alle Zeichner und ihre Beteiligungen erfasst werden.</p>

<p>9.2 Der Zeichner erklärt sich damit einverstanden, dass seine Daten in diesem Register erfasst werden.</p>

<p>9.3 Der Zeichner hat das Recht, die Richtigkeit seiner Daten zu überprüfen.</p>

<h2>10. Informationsrechte</h2>

<p>10.1 Der Zeichner hat das Recht, Informationen über die Geschäftstätigkeit der Angelus Group zu erhalten.</p>

<p>10.2 Die Angelus Group stellt regelmäßig Geschäftsberichte und Finanzberichte zur Verfügung.</p>

<p>10.3 Der Zeichner kann die Geschäftsbücher und Unterlagen der Angelus Group einsehen.</p>

<h2>11. Pflichten des Zeichners</h2>

<p>11.1 Der Zeichner verpflichtet sich, die Beteiligungspapiere nicht ohne Zustimmung abzutreten.</p>

<p>11.2 Der Zeichner verpflichtet sich, die Angelus Group unverzüglich über Änderungen seiner persönlichen oder wirtschaftlichen Verhältnisse zu informieren.</p>

<p>11.3 Der Zeichner verpflichtet sich, alle erforderlichen Compliance- und KYC-Anforderungen zu erfüllen.</p>

<h2>12. Haftung</h2>

<p>12.1 Die Angelus Group haftet nicht für Verluste oder Schäden, die durch die Investition entstehen.</p>

<p>12.2 Der Zeichner trägt das volle Risiko seiner Investition.</p>

<p>12.3 Die Angelus Group haftet nur für Schäden, die durch vorsätzliches Verhalten oder grobe Fahrlässigkeit entstehen.</p>

<h2>13. Schiedsgerichtsbarkeit</h2>

<p>13.1 Alle Streitigkeiten werden durch Schiedsverfahren nach den DIS-Regeln beigelegt.</p>

<p>13.2 Der ordentliche Rechtsweg ist ausgeschlossen.</p>

<p>13.3 Der Schiedsspruch ist endgültig und verbindlich.</p>

<h2>14. Datenschutz</h2>

<p>14.1 Die Angelus Group verarbeitet personenbezogene Daten des Zeichners gemäß der Datenschutzerklärung.</p>

<p>14.2 Der Zeichner erklärt sich damit einverstanden, dass seine Daten verarbeitet werden.</p>

<h2>15. Änderungen der AGB</h2>

<p>15.1 Die Angelus Group behält sich das Recht vor, diese AGB zu ändern.</p>

<p>15.2 Änderungen werden dem Zeichner schriftlich mitgeteilt.</p>

<p>15.3 Der Zeichner hat das Recht, die Beteiligung zu beenden, wenn er mit Änderungen nicht einverstanden ist.</p>

<h2>16. Salvatorische Klausel</h2>

<p>16.1 Sollte eine Bestimmung dieser AGB unwirksam sein, bleibt die Gültigkeit der übrigen Bestimmungen unberührt.</p>

<h2>17. Anwendbares Recht</h2>

<p>17.1 Diese AGB unterliegen deutschem Recht.</p>

<p>17.2 Die Kollisionsnormen sind ausgeschlossen.</p>
    `,
  },
  {
    name: "KYC/AML Vereinbarung",
    type: "other",
    validFrom: new Date().toISOString().split("T")[0],
    content: `
<h1>KYC/AML VEREINBARUNG</h1>

<p><strong>Know Your Customer (KYC) und Anti-Geldwäsche (AML) Vereinbarung</strong></p>

<p><strong>Angelus Group</strong></p>

<h2>1. Zweck und Geltungsbereich</h2>

<p>1.1 Diese Vereinbarung regelt die Know Your Customer (KYC) und Anti-Geldwäsche (AML) Anforderungen für alle Zeichner von Beteiligungspapieren der Angelus Group.</p>

<p>1.2 Die Angelus Group ist verpflichtet, KYC- und AML-Überprüfungen durchzuführen, um Geldwäsche, Terrorismusfinanzierung und andere illegale Aktivitäten zu verhindern.</p>

<p>1.3 Der Zeichner erklärt sich damit einverstanden, alle erforderlichen Informationen und Dokumente bereitzustellen.</p>

<h2>2. KYC-Anforderungen</h2>

<p>2.1 <strong>Identitätsprüfung:</strong> Der Zeichner muss seine Identität durch ein gültiges Ausweisdokument nachweisen (Reisepass, Personalausweis, Führerschein).</p>

<p>2.2 <strong>Adressverifizierung:</strong> Der Zeichner muss seine Adresse durch ein aktuelles Dokument nachweisen (Stromrechnung, Mietvertrag, Kontoauszug).</p>

<p>2.3 <strong>Vermögensherkunft:</strong> Der Zeichner muss die Herkunft der Mittel nachweisen, die für die Investition verwendet werden.</p>

<p>2.4 <strong>Wirtschaftlicher Eigentümer:</strong> Bei juristischen Personen muss der wirtschaftliche Eigentümer identifiziert werden.</p>

<p>2.5 <strong>Berufliche Tätigkeit:</strong> Der Zeichner muss Informationen über seine berufliche Tätigkeit und Einkommensquellen bereitstellen.</p>

<h2>3. AML-Überprüfungen</h2>

<p>3.1 <strong>Sanktionslisten:</strong> Die Angelus Group überprüft, ob der Zeichner auf internationalen Sanktionslisten (OFAC, EU, UN) aufgeführt ist.</p>

<p>3.2 <strong>PEP-Status:</strong> Die Angelus Group überprüft, ob der Zeichner eine politisch exponierte Person (PEP) ist.</p>

<p>3.3 <strong>Negative Medienberichte:</strong> Die Angelus Group überprüft, ob es negative Medienberichte über den Zeichner gibt.</p>

<p>3.4 <strong>Geldwäscherisiko:</strong> Die Angelus Group bewertet das Geldwäscherisiko des Zeichners.</p>

<h2>4. Dokumentation</h2>

<p>4.1 Der Zeichner muss die folgenden Dokumente bereitstellen:</p>

<ul>
<li>Gültiger Personalausweis oder Reisepass</li>
<li>Adressnachweis (nicht älter als 3 Monate)</li>
<li>Nachweis der Vermögensherkunft</li>
<li>Nachweis des Einkommens (Gehaltsabrechnung, Steuererklärung)</li>
<li>Bei Unternehmen: Handelsregisterauszug, Satzung, Gesellschafterliste</li>
<li>Bei PEPs: Zusätzliche Dokumentation</li>
</ul>

<p>4.2 Die Angelus Group kann zusätzliche Dokumente anfordern, wenn dies erforderlich ist.</p>

<h2>5. Überprüfungsprozess</h2>

<p>5.1 <strong>Initiale Überprüfung:</strong> Bei der Zeichnung wird eine initiale KYC/AML-Überprüfung durchgeführt.</p>

<p>5.2 <strong>Laufende Überprüfung:</strong> Die Angelus Group führt regelmäßig laufende Überprüfungen durch, um sicherzustellen, dass die Informationen aktuell sind.</p>

<p>5.3 <strong>Erhöhte Sorgfalt:</strong> Bei hohem Risiko kann eine erhöhte Sorgfalt erforderlich sein.</p>

<p>5.4 <strong>Vereinfachte Sorgfalt:</strong> Bei niedrigem Risiko kann eine vereinfachte Sorgfalt angewendet werden.</p>

<h2>6. Informationspflichten</h2>

<p>6.1 Der Zeichner verpflichtet sich, die Angelus Group unverzüglich über Änderungen seiner persönlichen oder wirtschaftlichen Verhältnisse zu informieren.</p>

<p>6.2 Der Zeichner verpflichtet sich, alle erforderlichen Informationen wahrheitsgemäß und vollständig bereitzustellen.</p>

<p>6.3 Der Zeichner verpflichtet sich, falsche oder irreführende Informationen nicht bereitzustellen.</p>

<h2>7. Sanktionen und Konsequenzen</h2>

<p>7.1 Sollte der Zeichner die KYC/AML-Anforderungen nicht erfüllen, behält sich die Angelus Group das Recht vor, die Zeichnung zu stornieren.</p>

<p>7.2 Sollte der Zeichner auf Sanktionslisten aufgeführt sein, wird die Zeichnung storniert und die Mittel werden zurückgegeben.</p>

<p>7.3 Sollte der Zeichner falsche Informationen bereitstellen, kann die Angelus Group die Zeichnung stornieren und rechtliche Maßnahmen einleiten.</p>

<h2>8. Datenschutz</h2>

<p>8.1 Die Angelus Group verarbeitet personenbezogene Daten des Zeichners für KYC/AML-Zwecke.</p>

<p>8.2 Die Daten werden gemäß der Datenschutzerklärung verarbeitet.</p>

<p>8.3 Der Zeichner hat das Recht, Zugang zu seinen Daten zu erhalten.</p>

<h2>9. Compliance mit Gesetzen</h2>

<p>9.1 Die Angelus Group erfüllt alle geltenden Gesetze und Vorschriften bezüglich KYC und AML.</p>

<p>9.2 Der Zeichner erklärt sich damit einverstanden, dass die Angelus Group alle erforderlichen Berichte an die zuständigen Behörden erstattet.</p>

<h2>10. Schiedsgerichtsbarkeit</h2>

<p>10.1 Alle Streitigkeiten bezüglich dieser Vereinbarung werden durch Schiedsverfahren beigelegt.</p>

<p>10.2 Der ordentliche Rechtsweg ist ausgeschlossen.</p>

<h2>11. Bestätigung</h2>

<p>Der Zeichner bestätigt hiermit, dass er diese KYC/AML-Vereinbarung gelesen und verstanden hat und sich an alle Anforderungen gebunden erklärt.</p>

<p>Datum: _______________</p>

<p>Unterschrift Investor: _____________________</p>

<p>Name (Druckbuchstaben): _____________________</p>
    `,
  },
  {
    name: "Prospekt",
    type: "prospectus",
    validFrom: new Date().toISOString().split("T")[0],
    content: `
<h1>PROSPEKT</h1>

<p><strong>Angelus Group Beteiligungspapiere</strong></p>

<p><strong>Angelus Bond 2026</strong></p>

<h2>1. Zusammenfassung</h2>

<p>1.1 <strong>Emittent:</strong> Angelus Group</p>

<p>1.2 <strong>Beteiligungstyp:</strong> Beteiligungspapiere</p>

<p>1.3 <strong>Gesamtvolumen:</strong> [Gesamtvolumen] EUR</p>

<p>1.4 <strong>Zeichnungspreis:</strong> [Preis] EUR pro Anteil</p>

<p>1.5 <strong>Mindestzeichnung:</strong> [Mindestbetrag] EUR</p>

<p>1.6 <strong>Laufzeit:</strong> [X] Monate</p>

<p>1.7 <strong>Zinssatz/Rendite:</strong> [X]% p.a.</p>

<h2>2. Über die Angelus Group</h2>

<p>2.1 <strong>Unternehmensstruktur:</strong> Die Angelus Group ist ein international tätiges Finanzunternehmen mit Sitz in [Ort].</p>

<p>2.2 <strong>Geschäftstätigkeit:</strong> Die Angelus Group ist in folgenden Bereichen tätig:</p>

<ul>
<li>Vermögensmanagement</li>
<li>Finanzberatung</li>
<li>Alternative Investitionen</li>
<li>Immobilieninvestitionen</li>
<li>Unternehmensfinanzierung</li>
</ul>

<p>2.3 <strong>Geschäftsleitung:</strong> Die Angelus Group wird von erfahrenen Fachleuten geleitet.</p>

<p>2.4 <strong>Finanzielle Situation:</strong> [Finanzielle Informationen]</p>

<h2>3. Beteiligungspapiere</h2>

<p>3.1 <strong>Beschreibung:</strong> Die Beteiligungspapiere verbriefen Beteiligungsrechte an der Angelus Group.</p>

<p>3.2 <strong>Rechte:</strong> Der Zeichner hat Anspruch auf:</p>

<ul>
<li>Anteilige Gewinnbeteiligung</li>
<li>Stimmrechte</li>
<li>Informationsrechte</li>
<li>Rückzahlungsanspruch am Ende der Laufzeit</li>
</ul>

<p>3.3 <strong>Laufzeit:</strong> Die Beteiligung hat eine Laufzeit von [X] Monaten.</p>

<p>3.4 <strong>Rückzahlung:</strong> Die Rückzahlung erfolgt am Ende der Laufzeit.</p>

<h2>4. Verwendung der Mittel</h2>

<p>4.1 Die durch die Zeichnung eingenommenen Mittel werden für folgende Zwecke verwendet:</p>

<ul>
<li>[Verwendungszweck 1]</li>
<li>[Verwendungszweck 2]</li>
<li>[Verwendungszweck 3]</li>
</ul>

<h2>5. Risiken</h2>

<p>5.1 Eine Investition in Beteiligungspapiere ist mit erheblichen Risiken verbunden, einschließlich:</p>

<ul>
<li>Totalverlustrisiko</li>
<li>Geschäftsrisiko</li>
<li>Liquiditätsrisiko</li>
<li>Marktrisiko</li>
<li>Regulatorisches Risiko</li>
</ul>

<p>5.2 Bitte lesen Sie die Risikooffenlegung sorgfältig durch.</p>

<h2>6. Finanzielle Prognosen</h2>

<p>6.1 <strong>Erwartete Rendite:</strong> [X]% p.a.</p>

<p>6.2 <strong>Gewinnprognose:</strong> [Gewinnprognose]</p>

<p>6.3 <strong>Hinweis:</strong> Diese Prognosen sind nicht garantiert und können sich ändern.</p>

<h2>7. Steuerliche Behandlung</h2>

<p>7.1 Die steuerliche Behandlung der Beteiligungspapiere hängt von den persönlichen Umständen des Zeichners ab.</p>

<p>7.2 Der Zeichner sollte einen Steuerberater konsultieren.</p>

<h2>8. Gebühren und Kosten</h2>

<p>8.1 <strong>Verwaltungsgebühr:</strong> [X]% p.a.</p>

<p>8.2 <strong>Gebühren bei Rückzahlung:</strong> [X]%</p>

<p>8.3 <strong>Sonstige Kosten:</strong> [Kosten]</p>

<h2>9. Schiedsgerichtsbarkeit</h2>

<p>9.1 Alle Streitigkeiten werden durch Schiedsverfahren nach den DIS-Regeln beigelegt.</p>

<p>9.2 Der ordentliche Rechtsweg ist ausgeschlossen.</p>

<h2>10. Kontaktinformationen</h2>

<p>10.1 <strong>Angelus Group</strong><br>
Adresse: [Adresse]<br>
Telefon: [Telefon]<br>
E-Mail: [E-Mail]<br>
Website: [Website]</p>

<h2>11. Wichtige Hinweise</h2>

<p>11.1 Dieser Prospekt stellt kein Angebot zum Kauf oder Verkauf von Beteiligungspapieren dar.</p>

<p>11.2 Der Prospekt ist nicht für die Verteilung in Ländern bestimmt, in denen dies nicht zulässig ist.</p>

<p>11.3 Potenzielle Zeichner sollten unabhängige rechtliche und finanzielle Beratung einholen.</p>

<p>11.4 Die Angelus Group übernimmt keine Haftung für die Richtigkeit oder Vollständigkeit des Prospekts.</p>

<h2>12. Bestätigung</h2>

<p>Der Zeichner bestätigt hiermit, dass er den Prospekt gelesen und verstanden hat.</p>

<p>Datum: _______________</p>

<p>Unterschrift Investor: _____________________</p>

<p>Name (Druckbuchstaben): _____________________</p>
    `,
  },
];

async function seedContractTemplates() {
  let connection;
  try {
    connection = await createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'angelus_portal',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log('✅ Datenbankverbindung hergestellt');

    // Admin-User ID (normalerweise 1)
    const adminUserId = 1;

    for (const template of contractTemplates) {
      const query = `
        INSERT INTO contract_templates 
        (name, type, content, version, validFrom, isActive, createdBy, updatedBy, createdAt, updatedAt)
        VALUES (?, ?, ?, '1.0', ?, true, ?, ?, NOW(), NOW())
      `;

      const values = [
        template.name,
        template.type,
        template.content,
        template.validFrom,
        adminUserId,
        adminUserId,
      ];

      await connection.execute(query, values);
      console.log(`✅ Vorlage erstellt: ${template.name}`);
    }

    console.log('\n✅ Alle Vertragsvorlagen erfolgreich geladen!');
  } catch (error) {
    console.error('❌ Fehler beim Laden der Vorlagen:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedContractTemplates();
