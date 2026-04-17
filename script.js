const TOTAL = 11;
let answers = {};

// ---- PROGRESS ----
function updateProgress(step) {
  document.getElementById('prog-fill').style.width = Math.round(step / TOTAL * 100) + '%';
  document.getElementById('prog-count').textContent =
    step <= TOTAL ? `Schritt ${step} von ${TOTAL}` : 'Fertig!';
}

// ---- STEPPER ----
const stepperData = { alter: 35 };
function stepperChange(key, delta) {
  const limits = { alter: [10, 90] };
  stepperData[key] = Math.max(limits[key][0], Math.min(limits[key][1], stepperData[key] + delta));
  document.getElementById(key + '-val').textContent = stepperData[key];
  answers['s_' + key] = stepperData[key];
}
// init alter answer
answers['s_alter'] = 35;

// ---- SLIDERS ----
function updateSlider(id, valId) {
  const val = document.getElementById(id).value;
  document.getElementById(valId).textContent = val;
  answers['s_' + id] = parseInt(val);
}
// init slider answers – nach DOM-Bereitschaft
function initSliderAnswers() {
  answers['s_gewicht'] = parseInt(document.getElementById('gewicht').value);
  answers['s_groesse'] = parseInt(document.getElementById('groesse').value);
  answers['s_schrittl'] = parseInt(document.getElementById('schrittl').value);
  answers['s_armlaenge'] = parseInt(document.getElementById('armlaenge').value);

  document.getElementById('gewicht').addEventListener('input', () => answers['s_gewicht'] = parseInt(document.getElementById('gewicht').value));
  document.getElementById('groesse').addEventListener('input', () => answers['s_groesse'] = parseInt(document.getElementById('groesse').value));
  document.getElementById('schrittl').addEventListener('input', () => answers['s_schrittl'] = parseInt(document.getElementById('schrittl').value));
  document.getElementById('armlaenge').addEventListener('input', () => answers['s_armlaenge'] = parseInt(document.getElementById('armlaenge').value));
}

// ---- TERRAIN SLIDERS ----
function updateTerrain(changed) {
  const ids = ['t1','t2','t3','t4'];
  const changedEl = document.getElementById(changed);
  const changedVal = parseInt(changedEl.value);

  // Sum of all OTHER sliders
  const othersSum = ids
    .filter(id => id !== changed)
    .reduce((sum, id) => sum + parseInt(document.getElementById(id).value), 0);

  // Cap the changed slider so total doesn't exceed 100
  const maxAllowed = 100 - othersSum;
  if (changedVal > maxAllowed) {
    changedEl.value = maxAllowed;
  }

  // Read final values and update display
  const vals = ids.map(id => parseInt(document.getElementById(id).value));
  const total = vals.reduce((a, b) => a + b, 0);
  const remaining = 100 - total;

  ids.forEach((id, i) => {
    document.getElementById(id + '-pct').textContent = vals[i];
    answers['s_' + id] = vals[i];
  });

  // Update remaining display
  const remEl = document.getElementById('terrain-remaining');
  if (remaining === 0) {
    remEl.textContent = '✓ 100% verteilt – perfekt!';
    remEl.style.color = 'var(--green)';
  } else {
    remEl.textContent = `Noch ${remaining}% zu verteilen.`;
    remEl.style.color = 'var(--navy)';
  }

  // Update total badge
  const el = document.getElementById('terrain-total');
  if (remaining === 0) {
    el.textContent = '✓ Gesamt: 100%';
    el.className = 'terrain-total ok';
    document.getElementById('next-7').disabled = false;
  } else {
    el.textContent = `Gesamt: ${total}% – noch ${remaining}% übrig`;
    el.className = 'terrain-total over';
    document.getElementById('next-7').disabled = true;
  }
}
// init terrain
answers['s_t1'] = 40; answers['s_t2'] = 30; answers['s_t3'] = 20; answers['s_t4'] = 10;

// ---- PICK (list) ----
function pick(btn, step, value, label) {
  btn.closest('.options').querySelectorAll('.opt').forEach(o => o.classList.remove('selected'));
  btn.classList.add('selected');
  answers['s' + step] = { value, label };
  const nb = document.getElementById('next-' + step);
  if (nb) nb.disabled = false;
}

// ---- PICK GRID ----
function pickGrid(btn, step, value, label) {
  btn.closest('.options-grid').querySelectorAll('.opt-grid').forEach(o => o.classList.remove('selected'));
  btn.classList.add('selected');
  answers['s' + step] = { value, label };
  const nb = document.getElementById('next-' + step + '-btn');
  if (nb) nb.disabled = false;
}

// ---- NAV ----
function goNext(step) {
  document.getElementById('step-' + step).classList.remove('active');
  document.getElementById('step-' + (step + 1)).classList.add('active');
  updateProgress(step + 1);
  window.scrollTo(0, 0);
}
function goBack(step) {
  document.getElementById('step-' + step).classList.remove('active');
  document.getElementById('step-' + (step - 1)).classList.add('active');
  updateProgress(step - 1);
  window.scrollTo(0, 0);
}

// ---- CALC RESULT ----
function calcResult() {
  const alter    = answers['s_alter'] || 35;
  const gewicht  = answers['s_gewicht'] || 80;
  const groesse  = answers['s_groesse'] || 175;
  const schrittl = answers['s_schrittl'] || 80;
  const armlaenge= answers['s_armlaenge'] || 62;
  const einsatz  = answers['s6']?.value || 'trekking';
  const t1 = answers['s_t1'] || 40; // Asphalt
  const t2 = answers['s_t2'] || 30; // Waldweg
  const t3 = answers['s_t3'] || 20; // Singletrack
  const t4 = answers['s_t4'] || 10; // Feldweg
  const km       = answers['s8']?.value || 'km_mid';
  const hm       = answers['s9']?.value || 'hm_huegel';
  const ebike    = answers['s10']?.value || 'ebike_nein';
  const exp      = answers['s11']?.value || 'exp_basics';

  const specs = [];
  const preise = [];

  // ---- RAHMENGRÖSSE BERECHNEN ----
  let rahmenGroesse = '';
  let rahmenLabel = '';
  let rahmenSub = 'Berechnet aus deinen Körpermaßen';

  if (einsatz === 'mtb_trail' || einsatz === 'mtb_xc') {
    // Moderne MTBs werden über Reach (horizontaler Abstand Tretlager → Steuerrohr) bemessen.
    // Sitzrohrlänge ist irrelevant – wird durch Vario-Sattelstütze ausgeglichen.
    // Reach-Richtwerte nach Körpergröße (Community + Hersteller-Konsens):
    // bis 157 cm  → XS  (Reach ~390–420 mm)
    // 157–167 cm  → S   (Reach ~410–450 mm)
    // 167–179 cm  → M   (Reach ~430–470 mm)
    // 177–189 cm  → L   (Reach ~450–490 mm)
    // ab 189 cm   → XL  (Reach ~470–510 mm)
    //
    // Korrekturfaktor: langer Rumpf/Arme → eher größer; kurzer Rumpf/kurze Arme → eher kleiner
    const rumpf = groesse - schrittl; // Rumpflänge näherungsweise
    const rumpfNorm = groesse * 0.53; // Rumpfanteil ~53% der Körpergröße (Körpergröße minus Beinlänge)
    const rumpfDelta = rumpf - rumpfNorm; // positiv = langer Rumpf, negativ = kurzer Rumpf

    // Arm-Korrekturfaktor (Normwert ca. 60cm bei 175cm Körpergröße)
    const armNorm = groesse * 0.343;
    const armDelta = armlaenge - armNorm;

    // Kombinierter Korrekturfaktor: langer Rumpf + lange Arme → Tendenz größer
    const korrektiv = rumpfDelta + armDelta;

    let reachMin, reachMax, groesseLabel;
    if (groesse < 157) {
      reachMin = 390; reachMax = 420; groesseLabel = 'XS';
    } else if (groesse < 167) {
      reachMin = 410; reachMax = 450; groesseLabel = 'S';
    } else if (groesse < 177) {
      reachMin = 430; reachMax = 470; groesseLabel = 'M';
    } else if (groesse < 189) {
      reachMin = 450; reachMax = 490; groesseLabel = 'L';
    } else {
      reachMin = 470; reachMax = 510; groesseLabel = 'XL';
    }

    // Korrektiv-Hinweis für Grenzfälle
    let korrektivHinweis = '';
    if (korrektiv > 4) {
      korrektivHinweis = ' – langer Rumpf/Arme: eher oberes Ende des Reach-Bereichs oder eine Größe größer prüfen';
    } else if (korrektiv < -4) {
      korrektivHinweis = ' – kurzer Rumpf/Arme: eher unteres Ende des Reach-Bereichs oder eine Größe kleiner prüfen';
    }

    rahmenGroesse = groesseLabel;
    rahmenLabel = 'MTB-Rahmengröße (Reach-basiert)';
    rahmenSub = `Empfohlener Reach: ${reachMin}–${reachMax} mm${korrektivHinweis}. Beim modernen MTB zählt der Reach – nicht die Sitzrohrlänge.`;

  } else if (einsatz === 'gravel') {
    // Gravel: liegt zwischen Rennrad und MTB – Reach ist heute der maßgebliche Vergleichswert.
    // Gravel-Reach-Werte sind etwas kompakter als MTB, aber ähnlich strukturiert.
    // Richtwerte nach Körpergröße (Hersteller-Konsens für Gravelbikes):
    // bis 160 cm  → XS  (Reach ~360–390 mm)
    // 160–170 cm  → S   (Reach ~375–405 mm)
    // 170–180 cm  → M   (Reach ~390–420 mm)
    // 178–188 cm  → L   (Reach ~405–435 mm)
    // ab 187 cm   → XL  (Reach ~420–450 mm)

    const rumpfG = groesse - schrittl;
    const rumpfNormG = groesse * 0.53;
    const rumpfDeltaG = rumpfG - rumpfNormG;
    const armNormG = groesse * 0.343;
    const armDeltaG = armlaenge - armNormG;
    const korrektivG = rumpfDeltaG + armDeltaG;

    let reachMinG, reachMaxG, groesseLabelG;
    if (groesse < 160) {
      reachMinG = 360; reachMaxG = 390; groesseLabelG = 'XS';
    } else if (groesse < 170) {
      reachMinG = 375; reachMaxG = 405; groesseLabelG = 'S';
    } else if (groesse < 179) {
      reachMinG = 390; reachMaxG = 420; groesseLabelG = 'M';
    } else if (groesse < 188) {
      reachMinG = 405; reachMaxG = 435; groesseLabelG = 'L';
    } else {
      reachMinG = 420; reachMaxG = 450; groesseLabelG = 'XL';
    }

    let korrektivHinweisG = '';
    if (korrektivG > 4) {
      korrektivHinweisG = ' – langer Rumpf/Arme: eher oberes Ende des Reach-Bereichs oder eine Größe größer prüfen';
    } else if (korrektivG < -4) {
      korrektivHinweisG = ' – kurzer Rumpf/Arme: eher unteres Ende des Reach-Bereichs oder eine Größe kleiner prüfen';
    }

    rahmenGroesse = groesseLabelG;
    rahmenLabel = 'Gravel-Rahmengröße (Reach-basiert)';
    rahmenSub = `Empfohlener Reach: ${reachMinG}–${reachMaxG} mm${korrektivHinweisG}. Beim Gravel ist der Reach der entscheidende Vergleichswert – die Sitzrohrlänge wird durch Vorbau und Sattelstütze angepasst.`;

  } else {
    // Rennrad, Trekking, City: klassische Sitzrohr-basierte Berechnung
    let faktor = 0.685;
    if (einsatz === 'rennrad') faktor = 0.70;

    const rahmenCm = Math.round(schrittl * faktor);

    if (einsatz === 'rennrad') {
      if (rahmenCm <= 50) rahmenGroesse = `${rahmenCm} cm (XS)`;
      else if (rahmenCm <= 53) rahmenGroesse = `${rahmenCm} cm (S)`;
      else if (rahmenCm <= 56) rahmenGroesse = `${rahmenCm} cm (M)`;
      else if (rahmenCm <= 59) rahmenGroesse = `${rahmenCm} cm (L)`;
      else rahmenGroesse = `${rahmenCm} cm (XL)`;
      rahmenLabel = 'Rennrad-Rahmengröße (Rohrlänge)';
    } else {
      if (rahmenCm <= 46) rahmenGroesse = `${rahmenCm} cm (XS)`;
      else if (rahmenCm <= 50) rahmenGroesse = `${rahmenCm} cm (S)`;
      else if (rahmenCm <= 54) rahmenGroesse = `${rahmenCm} cm (M)`;
      else if (rahmenCm <= 58) rahmenGroesse = `${rahmenCm} cm (L)`;
      else rahmenGroesse = `${rahmenCm} cm (XL)`;
      rahmenLabel = 'Empfohlene Rahmengröße';
    }
  }

  // Vorbaulänge-Empfehlung aus Armlänge
  let vorbau = '90mm';
  if (armlaenge < 48) vorbau = '70–80mm';
  else if (armlaenge > 62) vorbau = '100–120mm';

  // Rahmen Highlight
  document.getElementById('rahmen-highlight').innerHTML = `
    <div class="rahmen-hl-label">${rahmenLabel}</div>
    <div class="rahmen-hl-val">${rahmenGroesse}</div>
    <div class="rahmen-hl-sub">${rahmenSub}</div>
  `;

  // ---- LAUFRADGRÖSSE ----
  let laufradVal = '', laufradWhy = '';

  if (alter < 10 || groesse < 130) {
    laufradVal = '20"';
    laufradWhy = 'Für Kinder bis ca. 130 cm Körpergröße die richtige Laufradgröße.';
  } else if (alter < 14 || groesse < 150) {
    laufradVal = '24"';
    laufradWhy = 'Für Kinder und Jugendliche bis ca. 150 cm – Übergang zur vollen Erwachsenengröße.';
  } else if (einsatz === 'rennrad') {
    laufradVal = '28" (700c)';
    laufradWhy = 'Standard beim Rennrad – geringer Rollwiderstand auf Asphalt, maximale Effizienz.';
  } else if (einsatz === 'city' || einsatz === 'trekking' || einsatz === 'gravel') {
    laufradVal = '28" (700c)';
    laufradWhy = 'Standard für Stadt, Trekking und Gravel – gute Rolleffizienz, breites Reifensortiment verfügbar.';
  } else if (einsatz === 'mtb_xc') {
    if (groesse >= 175) {
      laufradVal = '29"';
      laufradWhy = 'Ab 175 cm Körpergröße ist 29" im XC die effizientere Wahl – besseres Überrollen von Hindernissen, höhere Rollgeschwindigkeit.';
    } else {
      laufradVal = '27,5"';
      laufradWhy = 'Unter 175 cm passt 27,5" geometrisch besser – agileres Handling, kein Nachteil im XC-Einsatz.';
    }
  } else if (einsatz === 'mtb_trail') {
    if (groesse >= 180) {
      laufradVal = '29"';
      laufradWhy = 'Große Fahrer profitieren von 29" auch im Trail-Bereich – mehr Laufruhe, besseres Überrollen. Mullet (29" vorne / 27,5" hinten) als Alternative möglich: das größere Vorderrad für mehr Laufruhe bergab, das kleinere Hinterrad für mehr Agilität in Kurven.';
    } else if (groesse >= 165) {
      laufradVal = '27,5" oder 29" (Mullet möglich)';
      laufradWhy = '27,5" ist im Trail die vielseitigere Wahl – agiler bergab, ausreichend rollend bergauf. Mullet-Setup (29" vorne / 27,5" hinten) kombiniert das Beste aus beiden Welten. „Mullet" bezeichnet dabei die asymmetrische Laufradkombination: das größere Vorderrad rollt besser über Hindernisse und sorgt für mehr Laufruhe, das kleinere Hinterrad macht das Bike agiler und ermöglicht engere Kurvenradien.';
    } else {
      laufradVal = '27,5"';
      laufradWhy = 'Unter 165 cm ist 27,5" die bessere Wahl – 29" wird geometrisch für kleinere Fahrer problematisch.';
    }
  } else {
    // Fallback
    laufradVal = '28" (700c)';
    laufradWhy = 'Standard für die meisten Einsatzbereiche – gute Verfügbarkeit, breites Reifensortiment.';
  }

  specs.push({ icon: '⭕', label: 'Laufradgröße', value: laufradVal, why: laufradWhy, warn: '', tipp: '' });

  // ---- FAHRRADTYP ----
  let radTyp = '', radWhy = '', radWarn = '', radVon = 0, radBis = 0;
  const offroad = t2 + t3 + t4;
  const isEbike = ebike === 'ebike_ja' || (ebike === 'ebike_offen' && (alter > 55 || hm === 'hm_berg'));

  if (isEbike) {
    radTyp = '⚡ E-Bike'; radVon = 2000; radBis = 5000;
    radWhy = `Du hast dich für ein Fahrrad mit elektrischer Unterstützung entschieden – und das ist eine gute Entscheidung. Ein E-Bike bringt dich weiter, macht Strecken möglich, die du sonst auslassen würdest, und öffnet die Tür für gemeinsame Ausfahrten mit Freunden und Familie, auch wenn die konditionell unterschiedlich aufgestellt sind. Kurz: Du wirst mehr Rad fahren. Das ist gut für den Körper und die Gesundheit.`;
    radWarn = `Worüber du dir im Klaren sein solltest: Ein Akku hat eine begrenzte Lebensdauer von etwa 3–7 Jahren – danach ist ein Ersatz fällig, der schnell 500–1.000 € kosten kann. Lade deinen Akku regelmäßig und richtig (nicht dauerhaft vollgeladen lagern, nicht tiefentladen). Reifen und Antrieb verschleißen durch das höhere Gewicht und die höheren Geschwindigkeiten schneller als beim normalen Fahrrad – das gehört in deine Betriebskostenrechnung. Und: Entscheide dich für einen Motor eines Markenherstellers – Bosch, Panasonic oder Brose. Damit gehst du von Anfang an bösen Überraschungen und Reklamationen aus dem Weg.`;
  } else if (einsatz === 'city') {
    radTyp = '🏙 City-/Urbanbike'; radVon = 700; radBis = 1400;
    radWhy = 'Für deinen Haupteinsatz in der Stadt das richtige Werkzeug. Robust, praktisch, wartungsarm.';
    radWarn = '';
  } else if (einsatz === 'rennrad') {
    radTyp = '🏎 Rennrad'; radVon = 1200; radBis = 4000;
    radWhy = `${km === 'km_vhigh' ? 'Mit deinen Wochenkilometern' : 'Für deinen sportlichen Fokus'} auf Asphalt ist das Rennrad die richtige Wahl.`;
    radWarn = alter > 50 ? 'Mit 50+ lohnt sich ein Endurance-Rennrad (aufrechter, komfortabler) statt Race-Geometrie.' : 'Sitz- und Lenkerposition korrekt einstellen – falsche Einstellung führt bei längeren Fahrten zu Schmerzen in Rücken, Nacken und Handgelenken. Wer das Rad intensiv nutzt, für den lohnt sich ein professionelles Bikefitting.';
  } else if (einsatz === 'gravel') {
    radTyp = 'Gravel-Bike'; radVon = 1000; radBis = 3500;
    radWhy = `Bei deiner Untergrundverteilung (${t1}% Asphalt / ${offroad}% Off-Road) ist ein Gravel-Bike der ehrlichste Kompromiss.`;
    radWarn = '"Gravel" ist ein Trendbegriff – vergleiche konkret Rahmen, Schaltung und Bremsen, nicht den Markennamen.';
  } else if (einsatz === 'mtb_trail') {
    radTyp = '🏔 Trail-MTB'; radVon = 1500; radBis = 5000;
    radWhy = `${t3}% Singletrack und Trail-Fokus – hier brauchst du ein richtiges Trail-Rad, kein Kompromiss.`;
    radWarn = 'Fahrwerk-Service (Gabel + Dämpfer) regelmäßig einplanen – das wird beim Kauf oft nicht erwähnt.';
  } else if (einsatz === 'mtb_xc') {
    radTyp = '⛰ XC-MTB / Hardtail'; radVon = 800; radBis = 2500;
    radWhy = 'Cross-Country Fokus mit Ausdauer im Gelände – ein Hardtail ist hier effizienter und wartungsärmer.';
    radWarn = 'Auf die Federgabel achten – eine schlechte Gabel macht ein gutes Hardtail zur Enttäuschung.';
  } else {
    radTyp = '🗺 Trekkingrad'; radVon = 700; radBis = 2000;
    radWhy = `Bei ${t1}% Asphalt und ${offroad}% gemischtem Untergrund ist ein Trekkingrad dein ehrlichster Allrounder.`;
    radWarn = 'Trekkingräder sind aufgrund ihrer komplexen Zubehörteile mit 12 bis 16 kg schwer. Wer heute mit dem Radfahren anfängt, kann schnell Gefallen daran finden – und bald mehr wollen. Bzw. weniger. Nämlich weniger Gewicht am Rad. Diese Möglichkeit sollte vor dem Kauf bedacht werden.';
  }
  // E-Bike Einschätzung wenn Frage 10 = "unentschlossen"
  let radTipp = '';
  if (ebike === 'ebike_offen') {
    if (isEbike) {
      // System empfiehlt E-Bike wegen Alter/Gelände
      radTipp = '💡 Zur E-Bike Frage: Basierend auf deinem Profil – ' + (alter > 55 ? 'deinem Alter' : '') + (alter > 55 && hm === 'hm_berg' ? ' und ' : '') + (hm === 'hm_berg' ? 'dem bergigen Gelände' : '') + ' – empfehle ich dir ein E-Bike. Der Motor macht genau dort einen Unterschied, wo du ihn wirklich brauchst. Du wirst mehr fahren – und das mit mehr Freude.';
    } else {
      // System empfiehlt klassisches Rad
      radTipp = '💡 Zur E-Bike Frage: Basierend auf deinem Profil brauchst du keinen Motor. Deine Strecken, dein Gelände und deine körperliche Situation sprechen für ein klassisches Fahrrad. Ein E-Bike wäre technisch möglich – bringt dir hier aber keinen echten Mehrwert. Dafür bist du mit einem klassischen Rad leichter unterwegs, sparst bei der Anschaffung und hast deutlich weniger Folgekosten (kein Akku-Verschleiß, einfachere Wartung). Wenn du in ein paar Jahren nochmal überlegst – gut. Aber jetzt kauf dir ein klassisches Rad.';
    }
  }
  specs.push({ icon: '🚲', label: 'Fahrradtyp', value: radTyp, why: radWhy, warn: radWarn, tipp: radTipp });
  preise.push({ label: 'Komplettes Rad (Basis)', von: radVon, bis: radBis, note: 'Rahmen + Aufbau ab Händler' });

  // ---- FEDERUNG ----
  let fedVal = '', fedWhy = '', fedWarn = '';
  if (einsatz === 'city' || einsatz === 'rennrad' || einsatz === 'gravel') {
    fedVal = 'Starrgabel';
    if (einsatz === 'rennrad') {
      fedWhy = 'Rennräder fahren grundsätzlich mit Starrgabel – das gehört zur DNA des Fahrrads. Komfort erreichst du hier über den Reifendruck: breitere Reifen (28–32 mm) lassen sich mit wenig Luftdruck fahren und schlucken Unebenheiten deutlich besser als schmale Reifen mit hohem Druck. Das macht auf langen Touren einen spürbaren Unterschied – bei praktisch null Mehrkosten wenn du beim nächsten Reifenwechsel auf eine breitere Dimension gehst.';
    } else if (einsatz === 'gravel') {
      fedWhy = 'Gravel Bikes fahren mit Starrgabel – Federgabeln sind in diesem Segment absolut unüblich und auch nicht sinnvoll. Komfort holst du dir beim Gravel über den Reifen: breitere Reifen (40–50 mm) erlauben niedrigeren Luftdruck, der Unebenheiten und Schotter spürbar abfedert. Das ist die richtige und günstige Lösung – nicht eine Federgabel. Wer auf sehr ruppigem Terrain unterwegs ist, sollte eher über ein MTB nachdenken als über eine Federgabel am Gravel Bike.';
    } else {
      fedWhy = 'Für deinen Einsatz wartungsfrei und leichter.';
    }
  } else if (einsatz === 'mtb_trail') {
    if (t3 > 40) {
      fedVal = 'Vollfederung (Luftfeder)'; fedWhy = `${t3}% Singletrack – Vollfederung ist hier die richtige Wahl. Ein vollgefedertes Rad hat zwei Federelemente: Gabel vorne und Dämpfer hinten. Beide enthalten Öl, das mit der Zeit altert und seine Dämpfungseigenschaften verliert. Wer den Service vernachlässigt, merkt das zuerst am Fahrgefühl – das Rad wird unruhiger, der Grip schlechter, die Kontrolle bergab nimmt ab. Im schlimmsten Fall verschleißen Dichtungen und Lagerstellen, was deutlich teurer wird als ein rechtzeitiges Service. Gabel und Dämpfer sollten alle 100–200 Betriebsstunden gewartet werden – wer das regelmäßig macht, hat lange Freude an einem Rad das sich anfühlt wie am ersten Tag.`;
      preise.push({ label: 'Fahrwerk (Gabel + Dämpfer)', von: 400, bis: 1200, note: 'Luftfeder, RockShox/Fox' });
    } else {
      fedVal = 'Federgabel Hardtail (130–150mm)'; fedWhy = 'Für deinen Trail-Anteil reicht ein Hardtail mit guter Gabel. Unbedingt auf eine Luftfeder-Gabel achten – nur so lässt sich der Luftdruck exakt auf das Fahrergewicht abstimmen. Federgabeln mit Stahlfeder-System sind nur sehr begrenzt einstellbar – der Federkomfort bleibt dort hinter den Erwartungen, besonders im sportlichen Trail-Einsatz.';
      preise.push({ label: 'Federgabel', von: 250, bis: 600, note: 'Luftfeder, RockShox Pike/Fox Rhythm' });
    }
  } else if (t2 + t3 > 40) {
    fedVal = 'Federgabel (80–100mm)';
    fedWhy = `Bei ${offroad}% Off-Road macht eine Federgabel Sinn. Service alle 100–200 Betriebsstunden nicht vergessen.`;
    preise.push({ label: 'Federgabel', von: 150, bis: 400, note: 'Einstieg Luftfeder' });
  } else {
    fedVal = 'Starrgabel'; fedWhy = 'Bei überwiegend Asphalt und hartem Untergrund ist eine Starrgabel die effizientere Wahl.';
  }

  // Luftfeder-Hinweis direkt in why integrieren, kein separater Tipp-Block
  const istLeichterFahrer = gewicht < 65;
  const istSchwerFahrer = gewicht > 100;
  const istSportlicherFahrer = einsatz === 'mtb_trail' || einsatz === 'mtb_xc' || km === 'km_high' || km === 'km_vhigh';
  if (fedVal !== 'Starrgabel') {
    if (istSchwerFahrer) {
      // Starke, explizite Warnung für schwere Fahrer
      fedWhy += ` Bei deinem Gewicht solltest du unbedingt darauf achten, dass dein neues Fahrrad mit einer Luftfedergabel ausgestattet ist. Nur Luftfedergabeln können durch Druck an verschiedene Belastungen angepasst werden und gewährleisten so eine optimale Funktion ohne Durchzuschlagen. Bei Stahlfeder- und Elastomer-Systemen sind Einstellungen im erforderlichen Ausmaß nicht möglich.`;
      if (einsatz === 'mtb_trail' && t3 > 40) {
        fedWhy += ` Gleiches gilt für den Hinterbau-Dämpfer: Auch hier ausschließlich Luftfeder wählen.`;
      }
      fedWarn = `Wichtig bei ${gewicht} kg: Keine Stahlfeder-Gabel, kein Elastomer. Nur Luftfeder – sowohl an der Gabel als auch am Hinterbau-Dämpfer. Das ist keine Frage des Komforts, sondern der Funktion.`;
    } else if (einsatz !== 'mtb_trail') {
      if (istLeichterFahrer || istSportlicherFahrer) {
        fedWhy += ` Unbedingt auf eine Luftfeder-Gabel achten – der Luftdruck lässt sich exakt auf das Fahrergewicht abstimmen, was den Federweg und die Ansprechcharakteristik direkt beeinflusst.${istLeichterFahrer ? ' Bei leichten Fahrern (unter 65 kg) besonders wichtig – Stahlfedern sind oft zu hart und nicht ausreichend anpassbar.' : ''} Federgabeln mit Stahlfeder-System sind nur sehr begrenzt einstellbar – der Federkomfort bleibt dort hinter den Erwartungen.`;
      } else {
        fedWhy += ` Eine Luftfeder-Gabel ist empfehlenswert – sie lässt sich per Luftdruck auf das Fahrergewicht abstimmen und spricht dadurch besser an. Federgabeln mit Stahlfedern sind nur begrenzt einstellbar; die Erwartungen an Federkomfort und Dämpfung sollten dort nicht zu hoch sein.`;
      }
    }
  }

  specs.push({ icon: '🔰', label: 'Federung', value: fedVal, why: fedWhy, warn: fedWarn, tipp: '' });

  // ---- SCHALTUNG ----
  // Kilometerkalkulation: Mittelwert der gewählten km-Klasse × 52 Wochen × 7 Jahre
  const kmProWocheMap = { km_low: 20, km_mid: 65, km_high: 150, km_vhigh: 250 };
  const kmProWoche = kmProWocheMap[km] || 65;
  const km7JahreBasis = kmProWoche * 52 * 7;

  // Verschleißfaktor durch Höhenmeter:
  // Flach:   kein Aufschlag (Faktor 1.0)
  // Hügelig: +15% (Faktor 1.15) – häufigeres Schalten, mehr Zugkraft bergauf, mehr Bremslast bergab
  // Bergig:  +30% (Faktor 1.30) – alpine Touren, Pässe, deutlich kürzere Verschleißintervalle
  const verschleissFaktor = hm === 'hm_berg' ? 1.30 : hm === 'hm_huegel' ? 1.15 : 1.0;
  const km7Jahre = Math.round(km7JahreBasis * verschleissFaktor);
  const verschleissHinweis = verschleissFaktor > 1.0
    ? ` (inkl. ${Math.round((verschleissFaktor - 1) * 100)}% Verschleißaufschlag für ${hm === 'hm_berg' ? 'bergiges' : 'hügeliges'} Gelände)`
    : '';

  // Schaltwerk-Lebensdauer Referenzwerte (Erfahrungswerte Community):
  // Deore:  15.000–25.000 km → Grenze bei ~20.000 km
  // SLX:    25.000–35.000 km → Grenze bei ~30.000 km
  // XT:     35.000–50.000 km → Grenze bei ~42.000 km
  // XTR:    40.000–60.000 km → lohnt ab Rennsport/sehr hoch

  let schaltGruppe = '', schaltGruppeBegruendung = '', schaltGruppeWarn = '';
  let schVon = 0, schBis = 0;
  const brauchtGroesseUebersetzung = hm === 'hm_berg' || km === 'km_high' || km === 'km_vhigh';

  if (einsatz === 'city') {
    // Stadtrad → Nabenschaltung, km-Logik nicht anwendbar
    schaltGruppe = 'Nabenschaltung Shimano Nexus 7/8';
    schVon = 150; schBis = 350;
    schaltGruppeBegruendung = 'Die Empfehlung ist eine Nabenschaltung. Die Kosten für Ersatzteile dieser Schaltung sind deutlich geringer, der Aufwand bei Reinigung, Wartung und Einstellung ist minimal, und es gibt keine Elemente die verbogen oder beschädigt werden können – da sich der gesamte Schaltmechanismus im Nabenkörper befindet. Eine Nabenschaltung kann man im Stand schalten – wenn man vor der Ampel vergessen hat zurückzuschalten.';
    schaltGruppeWarn = '';
    specs.push({ icon: '⚙️', label: 'Schaltung', value: schaltGruppe, why: schaltGruppeBegruendung, warn: schaltGruppeWarn });
    preise.push({ label: 'Nabenschaltung', von: schVon, bis: schBis, note: 'Wartungsarme Stadtlösung' });

  } else if (einsatz === 'rennrad' || einsatz === 'gravel') {
    // Rennrad/Gravel → Shimano 105 / GRX – andere Gruppenlogik, kein MTB-Schaltwerk
    const grpName = km7Jahre > 54000
      ? (brauchtGroesseUebersetzung ? 'Shimano Ultegra / GRX 2×12 (Compact)' : 'Shimano Ultegra 2×12')
      : (brauchtGroesseUebersetzung ? 'Shimano 105 / GRX 2×11 (Compact)' : 'Shimano 105 / GRX 2×11');
    schVon = 250; schBis = 700;
    schaltGruppeBegruendung = `In 7 Jahren fährst du ca. ${Math.round(km7Jahre / 1000)}.000 km${verschleissHinweis}.${km7Jahre > 54000 ? ' Bei dieser Laufleistung lohnt Ultegra – robustere Lager, höhere Fertigungstoleranz.' : ' 105/GRX ist das Mittelklasse-Optimum: 95% der Topgruppen-Performance.'}${brauchtGroesseUebersetzung ? ' Compact-Übersetzung für Berge ist Pflicht.' : ''}`;
    schaltGruppeWarn = 'Den Kettenverschleiß im Auge behalten ist das Wichtigste. Wer die Zahnkränze gleichmäßig nutzt und die Kette rechtzeitig wechselt, spart viel Geld bei Kettenblatt und Kassette – denn ein rechtzeitiger Kettentausch verhindert den teuren Folgeverschleiß.';
    const rennradDowngrade = km7Jahre > 54000
      ? `💡 <strong>Tipp:</strong> Das Schaltwerk (Ultegra) ist die kritische Komponente – hier nicht sparen. Bei Schalthebeln, Kettenblatt und Kurbel kannst du auf Shimano 105 downgraden. Das bedeutet etwas schlechtere Schaltpräzision und ein paar Gramm mehr Gewicht – im Alltag kaum spürbar. Diese Teile verschleißen deutlich langsamer und können bei Bedarf später einzeln getauscht werden.`
      : `💡 <strong>Tipp:</strong> Das Schaltwerk (105/GRX) trägt den Hauptverschleiß – hier die empfohlene Gruppe nehmen. Bei Schalthebeln, Kettenblatt und Kurbel kannst du auf Shimano Tiagra downgraden – eine Stufe tiefer, nicht weiter. Das kostet etwas Schaltpräzision und bringt mehr Gewicht, ist aber technisch noch vertretbar. Tiagra ist die unterste Grenze für laufruhiges Schalten.`;
    specs.push({ icon: '⚙️', label: 'Schaltung', value: grpName, why: schaltGruppeBegruendung, warn: schaltGruppeWarn, tipp: rennradDowngrade });
    preise.push({ label: 'Schaltgruppe', von: schVon, bis: schBis, note: 'Schalthebel, Kassette, Kette' });

  } else {
    // MTB / Trekking → Schaltwerk-Lebensdauer-Logik
    let gruppenName = '';
    let gruppenKuerzel = '';

    if (km7Jahre <= 20000) {
      gruppenName = brauchtGroesseUebersetzung ? 'Shimano Deore 1×11 oder 2×10' : 'Shimano Deore 2×10';
      gruppenKuerzel = 'Deore';
      schVon = 100; schBis = 280;
    } else if (km7Jahre <= 35000) {
      gruppenName = brauchtGroesseUebersetzung ? 'Shimano SLX 1×12 (10–51T)' : 'Shimano SLX 1×11';
      gruppenKuerzel = 'SLX';
      schVon = 180; schBis = 380;
    } else if (km7Jahre <= 55000) {
      gruppenName = brauchtGroesseUebersetzung ? 'Shimano XT 1×12 (10–51T)' : 'Shimano XT 1×12';
      gruppenKuerzel = 'XT';
      schVon = 280; schBis = 520;
    } else {
      gruppenName = 'Shimano XT oder XTR 1×12';
      gruppenKuerzel = 'XT/XTR';
      schVon = 350; schBis = 800;
    }

    // Warum-Text mit Kilometer-Begründung
    const kmGerundet = Math.round(km7Jahre / 1000);
    let warumText = `In 7 Jahren fährst du bei deinen Angaben ca. ${kmGerundet}.000 km${verschleissHinweis}. `;
    if (gruppenKuerzel === 'Deore') {
      warumText += `Das Deore-Schaltwerk hält bis ~20.000 km zuverlässig – du liegst mit ${kmGerundet}.000 km gut im Rahmen. Für diesen Einsatz ist Deore die ehrlichste und günstigste Lösung.`;
    } else if (gruppenKuerzel === 'SLX') {
      warumText += `Deore-Schaltwerke sind bei ~20.000 km am Limit. SLX hält bis ~30.000–35.000 km und gibt dir bei ${kmGerundet}.000 km ausreichend Reserve. Gutes Preis-Leistungs-Verhältnis.`;
    } else if (gruppenKuerzel === 'XT') {
      warumText += `SLX wäre bei deiner Laufleistung zu knapp. Das XT-Schaltwerk hält 35.000–50.000 km und deckt deine ${kmGerundet}.000 km mit Reserve ab. Kugelgelagerte Röllchen, robusterer Spannarm.`;
    } else {
      warumText += `Bei ${kmGerundet}.000 km in 7 Jahren ist XT das Minimum. XTR lohnt sich, wenn du Gewicht sparen willst oder im Renneinsatz unterwegs bist. Sonst: XT ist die rationellere Entscheidung.`;
    }

    const warnText = 'Den Kettenverschleiß im Auge behalten ist das Wichtigste. Wer die Zahnkränze gleichmäßig nutzt und die Kette rechtzeitig wechselt, spart viel Geld bei Kettenblatt und Kassette – denn ein rechtzeitiger Kettentausch verhindert den teuren Folgeverschleiß.';

    // Downgrade-Hinweis für andere Komponenten – immer nur eine Gruppe tiefer
    let downgradeHinweis;
    if (gruppenKuerzel === 'Deore') {
      downgradeHinweis = `💡 <strong>Tipp:</strong> Das Schaltwerk trägt den Hauptverschleiß – hier unbedingt Deore nehmen. Bei Schalthebeln, Umwerfer, Kettenblatt und Kurbel ist Deore bereits die unterste sinnvolle Grenze – ein weiterer Downgrade auf Altus/Acera würde die Schaltpräzision merklich verschlechtern und lohnt sich nicht.`;
    } else if (gruppenKuerzel === 'SLX') {
      downgradeHinweis = `💡 <strong>Tipp:</strong> Das Schaltwerk (SLX) bleibt gesetzt – hier nicht sparen. Bei Schalthebeln, Umwerfer, Kettenblatt und Kurbel kannst du auf Deore-Niveau downgraden. Das kostet etwas Schaltpräzision und bringt ein paar Gramm mehr, aber technisch ist das vertretbar. Diese Teile verschleißen deutlich langsamer als das Schaltwerk und können bei Bedarf einzeln getauscht werden.`;
    } else if (gruppenKuerzel === 'XT') {
      downgradeHinweis = `💡 <strong>Tipp:</strong> Das Schaltwerk (XT) bleibt gesetzt – hier nicht sparen. Bei Schalthebeln, Umwerfer, Kettenblatt und Kurbel kannst du auf SLX-Niveau downgraden. Der Unterschied in der Praxis ist gering – etwas weniger präzises Schaltgefühl, minimal mehr Gewicht. Diese Teile verschleißen deutlich langsamer als das Schaltwerk und können später einzeln erneuert werden.`;
    } else {
      downgradeHinweis = `💡 <strong>Tipp:</strong> Das Schaltwerk (XT oder XTR) bleibt gesetzt – das ist bei dieser Laufleistung keine Frage. Bei Schalthebeln, Umwerfer, Kettenblatt und Kurbel kannst du auf XT-Niveau downgraden, wenn XTR zu teuer ist. Der Gewichtsunterschied ist dann minimal, die Funktion identisch. XTR lohnt sich wirklich nur, wenn Gewicht ein echtes Kriterium ist.`;
    }

    specs.push({
      icon: '⚙️',
      label: 'Schaltung',
      value: gruppenName,
      why: warumText,
      warn: warnText,
      tipp: downgradeHinweis
    });
    preise.push({ label: 'Schaltgruppe', von: schVon, bis: schBis, note: 'Schaltwerk, Schalthebel, Kassette' });
  }

  // ---- BREMSEN ----
  let bremVal = '', bremWhy = '', bremWarn = '', bremTipp = '';
  let bremVon = 0, bremBis = 0;

  if (!isEbike && einsatz === 'city' && km === 'km_low') {
    bremVal = 'Felgenbremse oder mech. Scheibe'; bremVon = 30; bremBis = 80;
    bremWhy = 'Felgenbremsen sind einfacher im Service, Ersatzteile kosten weniger, und die Bremsleistung ist für kurze Stadtfahrten absolut ausreichend. Wer mehr Bremsleistung will, tauscht einfach die Bremsbeläge gegen eine weichere Gummimischung – je weicher der Gummi, desto mehr Biss, desto höher aber auch der Verschleiß. Scheibenbremsen haben grundsätzlich mehr Bremsleistung und sind unabhängig vom Felgenzustand – dafür sind Folgekosten höher und Reparaturen aufwändiger. Bei Regen verlieren Felgenbremsen spürbar an Leistung – wer oft im Regen fährt, ist mit einer mechanischen Scheibenbremse besser bedient.';
    bremWarn = '';
    bremTipp = '';
  } else {
    // Bremsgruppe passend zur Schaltgruppe bestimmen
    // Faustregel: Deore-Niveau ist das Minimum (keine Bremsen darunter – Undichtigkeitsproblem)
    // Rennrad/Gravel: Shimano 105 / Ultegra hydraulisch
    // MTB: Deore / SLX / XT je nach Schaltgruppe

    let bremGruppe = '';
    let bremDowngrade = '';

    if (einsatz === 'rennrad' || einsatz === 'gravel') {
      if (km7Jahre > 54000) {
        bremGruppe = 'Shimano Ultegra hydraulisch';
        bremDowngrade = 'Shimano 105 hydraulisch';
        bremVon = 100; bremBis = 220;
      } else {
        bremGruppe = 'Shimano 105 hydraulisch';
        bremDowngrade = 'Shimano Tiagra hydraulisch';
        bremVon = 80; bremBis = 180;
      }
      bremVal = bremGruppe;
      bremWhy = `Zur empfohlenen Schaltgruppe passende Bremse. Hydraulisch ist Pflicht – mechanische Scheibenbremsen am Rennrad sind ein Kompromiss, kein Standard.`;
      bremWarn = 'Shimano = Mineralöl. Nicht mit DOT-Öl (SRAM, Magura) mischen – das zerstört die Dichtungen.';
      bremTipp = `💡 <strong>Tipp:</strong> Downgrade auf ${bremDowngrade} möglich – diese Bremse ist leicht schlechter dosierbar, aber zuverlässig dicht und wartungsfreundlich. Keine Bremsen unterhalb Shimano Tiagra hydraulisch nehmen – hier habe ich wiederholt Undichtigkeitsprobleme erlebt.`;

    } else {
      // MTB / Trekking: Gruppe aus km7Jahre ableiten (selbe Logik wie Schaltwerk)
      if (km7Jahre <= 20000) {
        bremGruppe = 'Shimano Deore hydraulisch';
        bremDowngrade = null;
        bremVon = 60; bremBis = 120;
      } else if (km7Jahre <= 35000) {
        bremGruppe = 'Shimano SLX hydraulisch';
        bremDowngrade = 'Shimano Deore';
        bremVon = 80; bremBis = 150;
      } else {
        bremGruppe = 'Shimano XT hydraulisch';
        bremDowngrade = 'Shimano Deore oder SLX';
        bremVon = 100; bremBis = 190;
      }

      bremVal = bremGruppe;
      bremWhy = `Zur empfohlenen Schaltgruppe passende Bremse. Hydraulisch ist heute Standard – funktioniert unabhängig von Nässe, Felgenzustand und Wetter.`;
      bremWarn = isEbike ? `E-Bike: Serienmäßig sind oft 160mm (hinten) / 180mm (vorne) verbaut – das ist zu wenig. Empfehlung: mindestens 180/180mm, besser 203/180mm (vorne/hinten). Mehr Kühlfläche = gleichbleibende Bremsleistung bei E-Bike-Gewicht und -Geschwindigkeit.` : '';

      // Downgrade-Tipp + Scheiben-Tipp
      const scheibentipp = `Unabhängig von der gewählten Bremse lohnt sich eine <strong>Shimano XT Bremsscheibe</strong> – ihre leicht aufgeraute Oberfläche verbessert die Dosierbarkeit und Bremsperformance spürbar, auch in Kombination mit günstigeren Bremssätteln.`;

      if (bremDowngrade) {
        bremTipp = `💡 <strong>Tipp:</strong> Downgrade auf ${bremDowngrade} ist möglich – zuverlässig dicht, günstigere Ersatzteile. Keine Bremsen unterhalb Shimano Deore nehmen – hier habe ich wiederholt Undichtigkeitsprobleme erlebt.${isEbike ? ` Serienmäßig sind oft 160mm (hinten) / 180mm (vorne) verbaut – ich empfehle mindestens 180/180mm, besser 203/180mm (vorne/hinten).` : ''} ${scheibentipp}`;
      } else {
        bremTipp = `💡 <strong>Tipp:</strong> Deore ist das empfohlene Minimum – keine Bremsen günstigerer Gruppen nehmen. In der Praxis zeigen diese Bremsen häufig Probleme mit Undichtigkeit.${isEbike ? ` Serienmäßig sind oft 160mm (hinten) / 180mm (vorne) verbaut – ich empfehle mindestens 180/180mm, besser 203/180mm (vorne/hinten).` : ''} ${scheibentipp}`;
      }
    }
  }
  specs.push({ icon: '🔴', label: 'Bremsen', value: bremVal, why: bremWhy, warn: bremWarn, tipp: bremTipp });
  preise.push({ label: 'Bremsen (pro Stück)', von: bremVon, bis: bremBis, note: 'Vorne + Hinten, je Bremse' });

  // ---- REIFEN ----
  let reifVal = '', reifWhy = '', reifWarn = '', reifTipp = '';
  let reifVon = 0, reifBis = 0;

  const istSportlich = einsatz === 'mtb_trail' || einsatz === 'mtb_xc' || einsatz === 'gravel' || einsatz === 'rennrad';
  const istAlltag = einsatz === 'city' || einsatz === 'trekking';

  // Grundempfehlung ist immer Draht-/Faltreifen mit Schlauch
  reifVal = 'Draht-/Faltreifen mit Schlauch';
  reifVon = 30; reifBis = 80;

  if (istAlltag) {
    reifWhy = 'Für Stadt und Alltag die eindeutig richtige Wahl. Draht- und Faltreife mit Schlauch sind überall erhältlich, einfach zu wechseln und im Pannenfall auch am Straßenrand problemlos zu reparieren. Kein Sonderwerkzeug, kein Aufwand.';
    reifWarn = '';
    reifTipp = '';
  } else if (einsatz === 'mtb_trail' || t3 > 30) {
    reifWhy = `Draht-/Faltreifen mit Schlauch sind einfach zu wechseln, überall verfügbar und im Pannenfall am Trail kein Problem – Schlauch rein, fertig. Das ist die unkomplizierteste Lösung und für viele Fahrer die richtige Wahl.`;
    reifWarn = '';
    reifTipp = `💡 <strong>Upgrade-Tipp: Tubeless Ready</strong> – Wenn du viel Trail fährst, lohnt sich der Umstieg auf ein Tubeless-System. Die Vorteile: weniger Luftdruck möglich (mehr Grip, besserer Komfort), kleine Einstiche dichten sich durch die Dichtmilch oft selbst ab (keine Reifenpanne). Der Verschleiß der Reifen selbst ist ähnlich wie mit Schlauch. <strong>Aber ehrlich:</strong> Tubeless bedeutet Mehraufwand. Die Dichtmilch muss alle 2–4 Monate kontrolliert und bei Bedarf erneuert werden – trockene Milch dichtet nicht mehr ab. Das Aufziehen ist komplizierter als bei einem normalen Reifen. Und bei einem größeren Riss hilft nur ein mitgeführter Schlauch als Notlösung. Für viele Alltags-Trailfahrer ist der ehrliche Mehrwert überschaubar – aber wer konsequent fährt, weiß den Grip-Gewinn zu schätzen. Einmaliges Setup-Budget: ca. 60–120 €.`;
    preise.push({ label: 'Tubeless-Setup (optional, einmalig)', von: 60, bis: 120, note: 'Felgenband, Ventile, Milch, Reifen' });
  } else if (istSportlich) {
    reifWhy = `Draht-/Faltreifen mit Schlauch sind überall verfügbar, einfach zu wechseln und im Pannenfall unkompliziert zu reparieren. Für den Einstieg und für alle, die keine Lust auf Mehraufwand haben, ist das die richtige und sinnvollste Wahl.`;
    reifWarn = '';
    reifTipp = `💡 <strong>Upgrade-Tipp: Tubeless Ready</strong> – Für sportliche Einsätze auf Schotter oder Gravel lohnt sich das Thema Tubeless. Weniger Luftdruck möglich (besserer Grip, weniger Vibrationen), kleine Einstiche dichten sich oft von selbst ab. <strong>Aber auch hier gilt:</strong> Tubeless bedeutet Mehraufwand. Die Dichtmilch trocknet aus und muss alle 2–4 Monate erneuert werden – wer das vergisst, hat kein funktionierendes System mehr. Das Aufziehen ist anspruchsvoller als mit Schlauch, und einen Ersatzschlauch für den Notfall sollte man immer dabei haben. Kosten und Verschleiß der Reifen selbst unterscheiden sich kaum von Reifen mit Schlauch – der Aufwand entsteht durch die laufende Milch-Pflege. Einmaliges Setup-Budget: ca. 50–100 €.`;
    preise.push({ label: 'Tubeless-Setup (optional, einmalig)', von: 50, bis: 100, note: 'Felgenband, Ventile, Milch, Reifen' });
  } else {
    reifWhy = `Draht-/Faltreifen mit Schlauch sind die einfachste und zuverlässigste Wahl. Überall erhältlich, einfach zu wechseln – auch ohne Pannenkurs am Straßenrand.`;
    reifWarn = '';
    reifTipp = '';
  }
  specs.push({ icon: '🔵', label: 'Reifen-System', value: reifVal, why: reifWhy, warn: reifWarn, tipp: reifTipp });

  // ---- ALTER/KOMFORT-HINWEIS ----
  let komfortVal = '', komfortWhy = '';
  if (alter >= 50) {
    komfortVal = 'Komfort-Geometrie empfohlen';
    komfortWhy = `Mit ${alter} Jahren lohnt sich ein etwas aufrechter Sitz – Endurance-Geometrie statt Race. Gefederte Sattelstütze oder Federsattel können Rücken und Po schonen. Kein Kompromiss beim Spaß, aber weniger Schmerzen nach 3 Stunden.`;
  } else if (alter <= 25 && km === 'km_vhigh') {
    komfortVal = 'Sportliche Race-Geometrie möglich';
    komfortWhy = `Mit ${alter} Jahren und hohem Trainingsumfang verträgt dein Körper eine aggressivere Position gut. Trotzdem: Bikefitting macht den Unterschied zwischen "gut" und "perfekt".`;
  } else {
    komfortVal = 'Neutrale / Allroad-Geometrie';
    komfortWhy = 'Weder zu sportlich noch zu aufrecht – der vernünftige Mittelweg für die meisten Fahrer.';
  }
  specs.push({ icon: '🧘', label: 'Geometrie & Komfort', value: komfortVal, why: komfortWhy, warn: '' });

  // ---- WARTUNG ----
  let wartVal = '', wartWhy = '';
  let wartVon = 0, wartBis = 0;
  if (exp === 'exp_einsteiger') {
    wartVal = 'Einfache Komponenten + Werkstatt'; wartVon = 80; wartBis = 150;
    wartWhy = 'Als Einsteiger: lieber einfache, standardisierte Komponenten wählen. Keine Eigenteile, kein proprietäres Zubehör. Jährliche Inspektion einplanen.';
    preise.push({ label: 'Jährliche Werkstatt-Inspektion', von: wartVon, bis: wartBis, note: 'Laufende Kosten pro Jahr' });
  } else if (exp === 'exp_profi') {
    wartVal = 'Selbständige Vollwartung';
    wartWhy = 'Du kannst auch komplexe Gruppen und Fahrwerke wählen und selbst pflegen. Investiere einmalig in gutes Werkzeug.';
    preise.push({ label: 'Werkzeug (falls noch nicht vorhanden)', von: 150, bis: 400, note: 'Einmalige Investition' });
  } else {
    wartVal = 'Gemischte Wartung'; wartVon = 40; wartBis = 100;
    wartWhy = 'Basics selbst, komplexes zur Werkstatt. Kette/Kassette selbst wechseln spart am meisten – der Rest kann warten.';
    preise.push({ label: 'Werkstatt-Kosten pro Jahr (anteilig)', von: wartVon, bis: wartBis, note: 'Nur was du nicht selbst machst' });
  }
  specs.push({ icon: '🛠', label: 'Wartungs-Strategie', value: wartVal, why: wartWhy, warn: '' });

  // ---- RENDER SPECS ----
  let specHtml = '';
  specs.forEach(s => {
    specHtml += `<div class="spec-row">
      <div class="spec-icon">${s.icon}</div>
      <div class="spec-content">
        <div class="spec-label">${s.label}</div>
        <div class="spec-value">${s.value}</div>
        ${s.why ? `<div class="spec-why">${s.why}</div>` : ''}
        ${s.warn ? `<div class="spec-warn">⚠ ${s.warn}</div>` : ''}
        ${s.tipp ? `<div class="spec-tipp">${s.tipp}</div>` : ''}
      </div>
    </div>`;
  });
  document.getElementById('spec-grid').innerHTML = specHtml;

  // Staggered animation für Spec-Karten
  document.querySelectorAll('.spec-row').forEach((row, i) => {
    row.style.animationDelay = (i * 80) + 'ms';
  });

  // ---- XXL-HINWEIS ----
  const xxlBox = document.getElementById('xxl-hinweis');
  if (gewicht > 100 || groesse > 195) {
    let xxlGrund = [];
    if (gewicht > 100) xxlGrund.push('deinem Gewicht von ' + gewicht + ' kg');
    if (groesse > 195) xxlGrund.push('deiner Körpergröße von ' + groesse + ' cm');
    const xxlGrundText = xxlGrund.join(' und ');

    xxlBox.innerHTML = `
      <div style="font-size:13px; font-weight:700; color:var(--orange); letter-spacing:1px; text-transform:uppercase; margin-bottom:10px;">⚠ Hinweis: Du bist im XXL-Bereich</div>
      <p style="font-size:14px; line-height:1.6; margin:0 0 12px;">
        Aufgrund von ${xxlGrundText} wirst du bei Standard-Händlern und Massenherstellern nur schwer ein passendes Rad finden. Die meisten Serienräder sind bis etwa 120 kg Systemgewicht und bis ~195 cm Körpergröße ausgelegt – danach wird die Auswahl dünn.
      </p>
      <p style="font-size:14px; line-height:1.6; margin:0 0 14px;">
        Diese drei Hersteller haben sich auf genau deinen Bereich spezialisiert und sind dein bester Startpunkt:
      </p>
      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:4px;">
        <div style="background:#f9f6f2; border-left:3px solid var(--orange); border-radius:0 8px 8px 0; padding:12px 14px;">
          <div style="font-weight:700; font-size:14px; color:var(--navy); margin-bottom:4px;">🏭 MAXX Bikes – Rosenheim (DE)</div>
          <div style="font-size:13px; line-height:1.5; color:#333;">Der Spezialist für große Fahrer von Stange. Körpergrößen 1,90–2,15 m, Systemgewicht bis 185 kg, Online-Konfigurator, breite Modellpalette von MTB bis E-Trekking. <a href="https://www.maxx.de" target="_blank" style="color:var(--orange);">maxx.de</a></div>
        </div>
        <div style="background:#f9f6f2; border-left:3px solid var(--orange); border-radius:0 8px 8px 0; padding:12px 14px;">
          <div style="font-weight:700; font-size:14px; color:var(--navy); margin-bottom:4px;">🏭 Schauff Sumo – Remagen (DE)</div>
          <div style="font-size:13px; line-height:1.5; color:#333;">Stahlrahmen, handgefertigt, Schwerpunkt auf sehr hohem Körpergewicht. Das Modell „Sumo" trägt bis zu 190 kg Zuladung und ist eines der bekanntesten XXL-Räder überhaupt – robust, langlebig, kein Kompromiss. <a href="https://www.schauff.de" target="_blank" style="color:var(--orange);">schauff.de</a></div>
        </div>
        <div style="background:#f9f6f2; border-left:3px solid var(--orange); border-radius:0 8px 8px 0; padding:12px 14px;">
          <div style="font-weight:700; font-size:14px; color:var(--navy); margin-bottom:4px;">🏭 Nicolai – Eschenlohe (DE)</div>
          <div style="font-size:13px; line-height:1.5; color:#333;">Maßrahmen für MTB-Fahrer mit extremen Körpermaßen. Hochfestes 7020-T6-Aluminium, auf Anfrage für jede Größe und jeden Körperbau gefertigt. Klare Empfehlung für ambitionierte Biker jenseits der Normgrößen. <a href="https://www.nicolai.net" target="_blank" style="color:var(--orange);">nicolai.net</a></div>
        </div>
      </div>
    `;
    xxlBox.style.display = 'block';
  } else {
    xxlBox.style.display = 'none';
    xxlBox.innerHTML = '';
  }

  // ---- SUMMARY RENDERN ----
  const einsatzLabels = { city:'Stadtrad', trekking:'Trekking', rennrad:'Rennrad', gravel:'Gravel', mtb_xc:'MTB Cross Country', mtb_trail:'MTB Trail' };
  const kmLabels = { km_low:'bis 30 km/Wo', km_mid:'30–100 km/Wo', km_high:'100–200 km/Wo', km_vhigh:'über 200 km/Wo' };
  const hmLabels = { hm_flach:'Flaches Gelände', hm_huegel:'Hügelig', hm_berg:'Bergig' };
  const ebikeLabels = { ebike_ja:'E-Bike', ebike_nein:'Ohne Motor', ebike_offen:'Offen' };
  const expLabels = { exp_einsteiger:'Einsteiger', exp_basics:'Basics', exp_fortg:'Fortgeschritten', exp_profi:'Profi' };

  const summaryItems = [
    { label: 'Alter', val: alter + ' Jahre' },
    { label: 'Gewicht', val: gewicht + ' kg' },
    { label: 'Körpergröße', val: groesse + ' cm' },
    { label: 'Schrittlänge', val: schrittl + ' cm' },
    { label: 'Einsatzbereich', val: einsatzLabels[einsatz] || einsatz },
    { label: 'Wöchentliche km', val: kmLabels[km] || km },
    { label: 'Gelände/Höhenmeter', val: hmLabels[hm] || hm },
    { label: 'Antrieb', val: ebikeLabels[ebike] || ebike },
    { label: 'Erfahrung', val: expLabels[exp] || exp },
    { label: 'Terrain', val: 'Asphalt ' + t1 + '% / Wald ' + t2 + '% / Single ' + t3 + '%' },
  ];

  const summaryGrid = document.getElementById('summary-grid');
  if (summaryGrid) {
    summaryGrid.innerHTML = summaryItems.map(function(item) {
      return '<div class="summary-item"><span>' + item.label + '</span>' + item.val + '</div>';
    }).join('');
  }

  // Ladeanimation → dann Ergebnis zeigen
  // Step-11 sofort ausblenden, bevor das Overlay erscheint
  document.getElementById('step-11').classList.remove('active');

  showLoadingOverlay(function() {
    document.getElementById('step-result').classList.add('active');
    updateProgress(TOTAL + 1);
    window.scrollTo(0, 0);
    launchConfetti();
  });
}

// ---- LADEANIMATION ----
function showLoadingOverlay(callback) {
  const delay = 2000 + Math.floor(Math.random() * 2001); // 2–4 Sekunden

  // CSS für Rad-Animation einmalig einfügen
  if (!document.getElementById('radl-spin-style')) {
    const style = document.createElement('style');
    style.id = 'radl-spin-style';
    style.textContent = '@keyframes radlSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }

  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:var(--cream);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;';

  overlay.innerHTML = `
    <div style="text-align:center; max-width:300px;">
      <div style="margin-bottom:28px;">
        <div style="display:inline-block; animation: radlSpin 1.4s linear infinite;">
          <svg width="88" height="88" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="#1c3448" stroke-width="5"/>
            <circle cx="40" cy="40" r="30" fill="none" stroke="#1c3448" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.35"/>
            <line x1="40" y1="40" x2="40" y2="5"  stroke="#2d6e9e" stroke-width="1.8"/>
            <line x1="40" y1="40" x2="40" y2="75" stroke="#2d6e9e" stroke-width="1.8"/>
            <line x1="40" y1="40" x2="5"  y2="40" stroke="#2d6e9e" stroke-width="1.8"/>
            <line x1="40" y1="40" x2="75" y2="40" stroke="#2d6e9e" stroke-width="1.8"/>
            <line x1="40" y1="40" x2="65" y2="14" stroke="#2d6e9e" stroke-width="1.8"/>
            <line x1="40" y1="40" x2="15" y2="66" stroke="#2d6e9e" stroke-width="1.8"/>
            <line x1="40" y1="40" x2="15" y2="14" stroke="#2d6e9e" stroke-width="1.8"/>
            <line x1="40" y1="40" x2="65" y2="66" stroke="#2d6e9e" stroke-width="1.8"/>
            <circle cx="40" cy="40" r="6" fill="#1c3448"/>
            <circle cx="40" cy="40" r="3" fill="#a8c8dc"/>
          </svg>
        </div>
      </div>
      <div style="font-family:'Dancing Script',cursive; font-size:28px; color:#1c3448; margin-bottom:14px; line-height:1.2;">Radl Hias</div>
      <p style="font-family:'Barlow',sans-serif; font-size:14px; color:#4a6a84; line-height:1.8; font-style:italic; margin:0;">
        Der Radl Hias schaut sich nochmal deine Daten an und überlegt, welches Fahrrad zu Dir passt&nbsp;…
      </p>
    </div>
  `;

  document.body.appendChild(overlay);

  setTimeout(function() {
    overlay.style.transition = 'opacity 0.5s ease';
    overlay.style.opacity = '0';
    setTimeout(function() {
      overlay.remove();
      callback();
    }, 500);
  }, delay);
}

// ---- KONFETTI ----
function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9997;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#c85a14','#1c3448','#2d6e9e','#f5f1eb','#a8c8dc','#e8a060'];
  const pieces = Array.from({length: 80}, function() {
    return {
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 100,
      r: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: 2 + Math.random() * 3,
      spin: (Math.random() - 0.5) * 0.2,
      angle: Math.random() * Math.PI * 2,
      sway: (Math.random() - 0.5) * 1.5
    };
  });

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(function(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r * 0.5);
      ctx.restore();
      p.y += p.speed;
      p.x += p.sway;
      p.angle += p.spin;
    });
    frame++;
    if (frame < 120) {
      requestAnimationFrame(draw);
    } else {
      canvas.remove();
    }
  }
  draw();
}

// ---- PDF EXPORT ----
function exportPDF() {
  const rahmenVal = document.querySelector('.rahmen-hl-val')?.textContent || '';
  const rahmenLabel = document.querySelector('.rahmen-hl-label')?.textContent || 'Rahmengröße';
  const rahmenSub = document.querySelector('.rahmen-hl-sub')?.textContent || '';

  const rows = document.querySelectorAll('#spec-grid .spec-row');
  let specsHtml = '';
  rows.forEach(function(row) {
    const label = row.querySelector('.spec-label')?.textContent || '';
    const value = row.querySelector('.spec-value')?.textContent || '';
    const why   = row.querySelector('.spec-why')?.textContent || '';
    const warn  = row.querySelector('.spec-warn')?.textContent || '';
    const tipp  = row.querySelector('.spec-tipp')?.textContent || '';
    specsHtml += '<tr><td style="padding:8px 10px;font-weight:700;color:#1c3448;border-bottom:1px solid #ede7dc;vertical-align:top;white-space:nowrap;">' + label + '</td>'
      + '<td style="padding:8px 10px;font-weight:700;color:#2d6e9e;border-bottom:1px solid #ede7dc;vertical-align:top;">' + value + '</td>'
      + '<td style="padding:8px 10px;font-size:12px;color:#444;border-bottom:1px solid #ede7dc;vertical-align:top;">'
      + (why || '')
      + (warn ? '<br><span style="color:#c85a14;">&#9888; ' + warn + '</span>' : '')
      + (tipp ? '<br><span style="color:#2a6a3a;">&#128161; ' + tipp + '</span>' : '')
      + '</td></tr>';
  });

  const summaryItems = document.querySelectorAll('#summary-grid .summary-item');
  let summaryHtml = '';
  summaryItems.forEach(function(item) {
    const label = item.querySelector('span')?.textContent || '';
    const val = item.textContent.replace(label, '').trim();
    summaryHtml += '<div style="font-size:12px;padding:3px 0;"><span style="color:#a8c8dc;">' + label + ':</span> ' + val + '</div>';
  });

  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    + '<title>Radl Hias \u2013 Meine Fahrrad-Empfehlung</title>'
    + '<style>body{font-family:Arial,sans-serif;margin:0;padding:0;color:#2a3a48;background:#fff;}'
    + 'table{border-collapse:collapse;width:100%;}'
    + '@media print{.no-print{display:none!important;}@page{margin:15mm;}}'
    + '</style></head><body>'
    + '<div style="background:#1c3448;padding:24px 32px;">'
    + '<div style="color:#f5f1eb;font-size:22px;font-weight:700;letter-spacing:1px;">Radl Hias</div>'
    + '<div style="color:#a8c8dc;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:2px;">Pers\u00f6nliche Fahrrad-Empfehlung</div>'
    + '</div>'
    + '<div style="background:#f0f6fb;border-left:4px solid #2d6e9e;margin:24px 32px 0;padding:16px 20px;border-radius:0 8px 8px 0;">'
    + '<div style="font-size:11px;color:#7a8a98;letter-spacing:2px;text-transform:uppercase;">' + rahmenLabel + '</div>'
    + '<div style="font-size:32px;font-weight:700;color:#1c3448;margin:4px 0;">' + rahmenVal + '</div>'
    + '<div style="font-size:12px;color:#555;">' + rahmenSub + '</div>'
    + '</div>'
    + '<div style="margin:20px 32px 0;padding:16px;background:#1c3448;border-radius:8px;color:#f5f1eb;">'
    + '<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#a8c8dc;margin-bottom:10px;">Dein Profil</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;">' + summaryHtml + '</div>'
    + '</div>'
    + '<div style="margin:20px 32px;">'
    + '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7a8a98;margin-bottom:10px;">Empfohlene Spezifikation</div>'
    + '<table><thead><tr>'
    + '<th style="text-align:left;padding:8px 10px;background:#f5f1eb;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#7a8a98;width:120px;">Komponente</th>'
    + '<th style="text-align:left;padding:8px 10px;background:#f5f1eb;font-size:10px;width:150px;">Empfehlung</th>'
    + '<th style="text-align:left;padding:8px 10px;background:#f5f1eb;font-size:10px;">Details</th>'
    + '</tr></thead><tbody>' + specsHtml + '</tbody></table>'
    + '</div>'
    + '<div style="margin:24px 32px;padding-top:16px;border-top:1px solid #ede7dc;font-size:11px;color:#aaa;">'
    + 'Erstellt mit Radl Hias Fahrrad-Berater \u00b7 Alle Empfehlungen basieren auf pers\u00f6nlicher Erfahrung und stellen keine verbindliche Fachberatung dar.'
    + '</div>'
    + '<div class="no-print" style="text-align:center;padding:20px;">'
    + '<button onclick="window.print()" style="background:#c85a14;color:white;border:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;">Drucken / Als PDF speichern</button>'
    + '</div>'
    + '</body></html>';

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
// ---- BIKE FITTING ACCORDION ----
function toggleFitStep(num) {
  const body = document.getElementById('fit-body-' + num);
  const chev = document.getElementById('fit-chev-' + num);
  const header = document.querySelector('#fit-step-' + num + ' .fitting-step-header');
  const isOpen = body.style.display !== 'none';
  // Close all
  [1,2,3,4].forEach(function(n) {
    const b = document.getElementById('fit-body-' + n);
    const c = document.getElementById('fit-chev-' + n);
    if (b) b.style.display = 'none';
    if (c) { c.style.transform = 'rotate(0deg)'; c.style.color = 'var(--blue)'; }
  });
  // Open clicked if it was closed
  if (!isOpen) {
    body.style.display = 'block';
    chev.style.transform = 'rotate(90deg)';
    chev.style.color = 'var(--orange)';
    setTimeout(function() {
      document.getElementById('fit-step-' + num).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }
}
function toggleGebrauchtStep(num) {
  const body = document.getElementById('gb-body-' + num);
  const chev = document.getElementById('gb-chev-' + num);
  const isOpen = body.style.display !== 'none';
  // Close all
  [1,2,3,4,5,6,7,8].forEach(function(n) {
    const b = document.getElementById('gb-body-' + n);
    const c = document.getElementById('gb-chev-' + n);
    if (b) b.style.display = 'none';
    if (c) { c.style.transform = 'rotate(0deg)'; c.style.color = 'var(--blue)'; }
  });
  // Open clicked if it was closed
  if (!isOpen) {
    body.style.display = 'block';
    chev.style.transform = 'rotate(90deg)';
    chev.style.color = 'var(--orange)';
    setTimeout(function() {
      document.getElementById('gb-step-' + num).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }
}

// Alle Schritte starten geschlossen
document.addEventListener('DOMContentLoaded', function() {
  // Bike-Fitting: alle Schritte geschlossen
  [1,2,3,4].forEach(function(n) {
    const b = document.getElementById('fit-body-' + n);
    if (b) b.style.display = 'none';
  });
  // Gebraucht-Check: alle Schritte geschlossen
  [1,2,3,4,5,6,7,8].forEach(function(n) {
    const b = document.getElementById('gb-body-' + n);
    if (b) b.style.display = 'none';
  });
});

function showTab(tab) {
  const beraterWrap = document.querySelector('.wizard-wrap-outer');
  const progWrap = document.querySelector('.prog-wrap');
  const faqBereich = document.getElementById('faq-bereich');
  const druckBereich = document.getElementById('druck-bereich');
  const fittingBereich = document.getElementById('fitting-bereich');
  const gebrauchtBereich = document.getElementById('gebraucht-bereich');
  const tabBerater = document.getElementById('tab-berater');
  const tabFaq = document.getElementById('tab-faq');
  const tabDruck = document.getElementById('tab-druck');
  const tabFitting = document.getElementById('tab-fitting');
  const tabGebraucht = document.getElementById('tab-gebraucht');

  // Reset all
  [tabBerater, tabFaq, tabDruck, tabFitting, tabGebraucht].forEach(function(t) {
    if (t) { t.style.borderBottomColor = 'transparent'; t.style.color = 'var(--text-dim)'; }
  });

  // Alle Bereiche verstecken
  function hideAll() {
    beraterWrap.style.display = 'none';
    progWrap.style.display = 'none';
    faqBereich.style.display = 'none';
    druckBereich.style.display = 'none';
    fittingBereich.style.display = 'none';
    if (gebrauchtBereich) gebrauchtBereich.style.display = 'none';
  }

  if (tab === 'berater') {
    hideAll();
    beraterWrap.style.display = '';
    progWrap.style.display = '';
    tabBerater.style.borderBottomColor = 'var(--orange)';
    tabBerater.style.color = 'var(--navy)';
  } else if (tab === 'gebraucht') {
    hideAll();
    if (gebrauchtBereich) gebrauchtBereich.style.display = 'block';
    tabGebraucht.style.borderBottomColor = 'var(--orange)';
    tabGebraucht.style.color = 'var(--navy)';
  } else if (tab === 'fitting') {
    hideAll();
    fittingBereich.style.display = 'block';
    tabFitting.style.borderBottomColor = 'var(--orange)';
    tabFitting.style.color = 'var(--navy)';
  } else if (tab === 'druck') {
    hideAll();
    druckBereich.style.display = 'block';
    tabDruck.style.borderBottomColor = 'var(--orange)';
    tabDruck.style.color = 'var(--navy)';
    berechneDruck();
  } else {
    hideAll();
    faqBereich.style.display = 'block';
    renderFaqAccordion();
    tabFaq.style.borderBottomColor = 'var(--orange)';
    tabFaq.style.color = 'var(--navy)';
  }
}

// ---- LUFTDRUCK LOGIK ----
function druckOpt(groupId, btn) {
  document.getElementById(groupId).querySelectorAll('.druck-opt').forEach(function(b) {
    b.classList.remove('selected');
  });
  btn.classList.add('selected');
}

function druckOptVal(groupId) {
  const sel = document.getElementById(groupId)?.querySelector('.druck-opt.selected');
  return sel ? sel.dataset.val : null;
}

function berechneDruck() {
  const gewicht = parseInt(document.getElementById('druck-gewicht')?.value || 80);
  const breite  = druckOptVal('druck-breite-opts');
  const profil  = druckOptVal('druck-profil-opts');
  const typ     = druckOptVal('druck-typ-opts');
  const grund   = druckOptVal('druck-grund-opts');
  const rad     = druckOptVal('druck-rad-opts');

  if (!breite || !profil || !typ || !grund || !rad) return;

  const breiteN = parseInt(breite); // mm; '66' = 2,4–2,6" MTB

  // ── 1. REFERENZ-DRÜCKE bei 75 kg Fahrergewicht, 28"/700c, Asphalt, Schlauch ──
  // Quellen: Schwalbe Pressure Prof, SILCA Pro Calculator, ADAC 2026, Maxxis Tech Guide
  // Hinterrad trägt ~57 % des Systemgewichts, Vorderrad ~43 %
  const refTable = [
    { w: 23, h: 6.8,  v: 5.8  },  // 23 mm – Rennrad-Slick
    { w: 28, h: 4.9,  v: 4.2  },  // 28 mm – Trekking/Gravel schmal
    { w: 38, h: 3.4,  v: 2.9  },  // 38–40 mm – Trekking/Hybrid
    { w: 50, h: 2.7,  v: 2.3  },  // 50–54 mm – City/Hybrid breit
    { w: 57, h: 2.1,  v: 1.85 },  // 57–60 mm ≈ 2,1–2,25" MTB
    { w: 66, h: 1.85, v: 1.60 },  // 61–66 mm ≈ 2,4–2,6" MTB
  ];

  // Referenzwert (lineare Interpolation für Zwischenwerte)
  let refH, refV;
  const lower = [...refTable].reverse().find(e => e.w <= breiteN) || refTable[0];
  const upper = refTable.find(e => e.w >= breiteN) || refTable[refTable.length - 1];
  if (lower.w === upper.w) {
    refH = lower.h; refV = lower.v;
  } else {
    const t = (breiteN - lower.w) / (upper.w - lower.w);
    refH = lower.h + t * (upper.h - lower.h);
    refV = lower.v + t * (upper.v - lower.v);
  }

  // ── 2. GEWICHTSSKALIERUNG ──
  // Industriestandard (Schwalbe, SILCA): ca. +1 % Druck pro kg Abweichung von 75 kg
  const gewichtFaktor = Math.max(0.65, Math.min(1.60, 1.0 + (gewicht - 75) * 0.010));
  refH *= gewichtFaktor;
  refV *= gewichtFaktor;

  // ── 3. FELGENGRÖSSE ──
  // Größere Felge = mehr Luftvolumen = etwas weniger Druck nötig (Schwalbe Pressure Prof)
  let radFaktor = 1.0;
  if      (rad === '26')      radFaktor = 1.05;
  else if (rad === '27.5')    radFaktor = 1.01;
  else if (rad === '28')      radFaktor = 1.00;  // Referenz
  else if (rad === '29')      radFaktor = 0.97;
  else if (rad === 'rennrad') radFaktor = 1.02;
  refH *= radFaktor;
  refV *= radFaktor;

  // ── 4. UNTERGRUND (absolut in bar) ──
  // Quelle: SILCA K-Faktor Methodik – weniger Druck für mehr Kontaktfläche auf losem Grund
  let grundAbzugH = 0.0, grundAbzugV = 0.0;
  if (grund === 'schotter') {
    grundAbzugH = breiteN <= 38 ? 0.40 : 0.30;
    grundAbzugV = breiteN <= 38 ? 0.35 : 0.25;
  } else if (grund === 'trail') {
    grundAbzugH = breiteN <= 38 ? 0.70 : 0.45;
    grundAbzugV = breiteN <= 38 ? 0.60 : 0.40;
  }
  refH -= grundAbzugH;
  refV -= grundAbzugV;

  // ── 5. REIFENPROFIL ──
  if (profil === 'gravel') { refH -= 0.10; refV -= 0.10; }
  if (profil === 'mtb')    { refH -= 0.15; refV -= 0.15; }

  // ── 6. TUBELESS ──
  // Auf Asphalt: 0,3–0,4 bar weniger möglich (kein Einquetschplatten-Risiko)
  // Off-Road: kleinerer Abzug – Untergrundkorrektur deckt den Haupteffekt bereits ab
  // Quelle: SRAM/Zipp Tire Pressure Guide, Maxxis Tech Guide
  if (typ === 'tubeless') {
    let tAbzug;
    if (breiteN >= 50) {
      tAbzug = grund === 'asphalt' ? 0.40 : 0.20;
    } else {
      tAbzug = grund === 'asphalt' ? 0.30 : 0.15;
    }
    refH -= tAbzug;
    refV -= tAbzug;
  }

  // ── 7. PLAUSIBILITÄTS-GRENZEN ──
  const isNarrow  = breiteN <= 28;
  const isRennrad = rad === 'rennrad';
  const maxH = (isRennrad || isNarrow) ? 8.5 : 5.5;
  const maxV = (isRennrad || isNarrow) ? 8.0 : 5.0;
  const minH = breiteN >= 50 ? 1.0 : (breiteN >= 38 ? 1.5 : 1.8);
  const minV = breiteN >= 50 ? 0.8 : (breiteN >= 38 ? 1.3 : 1.5);

  const druckH = Math.max(minH, Math.min(maxH, Math.round(refH * 10) / 10));
  const druckV = Math.max(minV, Math.min(maxV, Math.round(refV * 10) / 10));

  document.getElementById('druck-vorne').textContent  = druckV.toFixed(1);
  document.getElementById('druck-hinten').textContent = druckH.toFixed(1);

  // ── 8. ERKLÄRUNG ──
  let erkl = '';
  if (rad === 'rennrad' || breiteN <= 23) {
    erkl = 'Rennradreifen brauchen den höchsten Druck – das minimiert Rollwiderstand und Pannengefahr auf Asphalt. Bei Regen oder schlechtem Belag 0,3–0,5 bar weniger für mehr Grip.';
  } else if (breiteN <= 28) {
    erkl = 'Schmale Trekking- und Gravel-Reifen laufen mit hohem Druck. Auf nasser Fahrbahn 0,2–0,3 bar weniger einplanen – das verbessert die Haftung spürbar.';
  } else if (breiteN <= 38) {
    erkl = 'Im mittleren Breitenbereich hast du Spielraum: mehr Druck = schneller auf Asphalt, weniger Druck = mehr Komfort und Grip auf losem Untergrund.';
  } else if (breiteN <= 50) {
    erkl = 'Breite City- und Hybridreifen fahren mit moderatem Druck. Das Luftvolumen federt Unebenheiten schon ohne großen Komfortverlust ab.';
  } else {
    erkl = 'MTB-Reifen arbeiten mit niedrigem Druck – das Volumen schützt vor Felgenschlag. Zu viel Druck kostet Traktion und macht das Rad bergab unberechenbar.';
  }
  if (rad === '29') erkl += ' 29"-Räder rollen ruhiger über Hindernisse – das erlaubt etwas weniger Druck als ein 27,5er bei gleicher Bereifung.';
  if (rad === '26') erkl += ' 26"-Räder haben weniger Volumen und brauchen etwas mehr Druck, um denselben Rollwiderstand wie größere Laufräder zu erzielen.';
  if (typ === 'tubeless') erkl += ' Tubeless erlaubt auf Asphalt 0,3–0,4 bar weniger, off-road etwa 0,2 bar weniger – kein Einquetschplatten-Risiko, besserer Grip.';
  if (grund === 'trail')    erkl += ' Auf Trails gilt: lieber etwas zu wenig als zu viel – der Reifen muss sich dem Untergrund anpassen können.';
  if (grund === 'schotter') erkl += ' Auf Schotter etwas weniger als auf Asphalt – mehr Kontaktfläche, mehr Kontrolle.';

  document.getElementById('druck-erklaerung').textContent = erkl;
}

// ---- FAQ DATA ----
const faqData = {
  hersteller_allgemein: {
    frage: 'Ist Hersteller XY gut? Ist ein Fahrrad von Hersteller XY ein gutes Fahrrad?',
    antwort: `Diese Frage lässt sich nicht pauschal beantworten – und jeder der das behauptet, macht es sich zu einfach.<br><br>
    Die meisten Fahrradhersteller bauen Räder in verschiedenen Preisklassen, die für verschiedene Arten von Kunden gedacht sind. Nehmen wir KTM Fahrrad als Beispiel: KTM baut sehr gute Räder für alle Arten von Radfahrern. Kauft ein Kunde ein Rad das nicht zu ihm passt, hat nicht KTM etwas falsch gemacht – sondern der Verkäufer den Bedarf falsch ermittelt, oder der Kunde hat sich am Ende für das falsche Rad entschieden. Genauso verhält es sich bei allen anderen Herstellern. Egal ob Online-Direktversand oder stationär vertriebene Marke.<br><br>
    <strong>Was steckt eigentlich in einem Fahrrad?</strong><br><br>
    Bezieht man sich allein auf die Teile, lässt sich sagen: die Rahmen werden heute bei fast allen Marken in Asien produziert. Ob bei deutschen Marken wie Stevens, Rose, Canyon oder Gudereit, oder bei österreichischen Marken wie KTM Fahrrad oder Simplon – der Rahmen kommt in der Regel aus Asien. Und das ist kein Qualitätsmerkmal, das man verstecken müsste. Asiatische Rahmenhersteller haben inzwischen deutlich mehr Erfahrung im Rahmenbau, effizientere Fertigungssysteme und günstigere Produktionskosten als die meisten europäischen Hersteller. Das macht asiatisch produzierte Rahmen nicht schlechter – sondern preisgünstiger bei gleicher oder höherer Qualität.<br><br>
    Und wenn man an alle anderen Teile eines Fahrrads denkt: jeder Fahrradhersteller kauft dieselben Anbauteile bei denselben Lieferanten. Shimano, SRAM, RockShox, Ritchey – diese Komponenten findest du bei Rädern aller Marken und Preisklassen.<br><br>
    <strong>Was macht dann den Unterschied?</strong><br><br>
    Die Fahrradhersteller kochen alle mit dem gleichen Wasser. Das Salz in der Suppe sind die Kombinationen aus individueller Rahmengeometrie, der Auswahl der Anbauteile – und am Ende der Service, den man einem Käufer gegenüber bietet. Genau dort trennt sich die Spreu vom Weizen. Nicht beim Markennamen.`
  },
  laufradgroesse: {
    frage: '27,5" oder 29"? Wie groß sollten die Räder sein?',
    antwort: `Diese Frage wird im Fahrradhandel oft so gestellt, als wäre eine der beiden Größen grundsätzlich besser. Das stimmt nicht. Die Antwort hängt vom Fahrer, vom Einsatzbereich und vom Rad ab.<br><br>
    <strong>Was die Physik sagt</strong><br><br>
    Ein größeres Laufrad rollt bei gleicher Kraft leichter über Hindernisse hinweg – das ist ein geometrischer Fakt. Ein 29"-Rad trifft einen Stein oder eine Wurzel in einem flacheren Winkel als ein 27,5"-Rad, was den Widerstand reduziert und das Rad ruhiger laufen lässt. Dafür ist ein größeres Rad schwerer, hat mehr Massenträgheit beim Beschleunigen und reagiert etwas langsamer auf Lenkbewegungen.<br><br>
    <strong>Was das in der Praxis bedeutet</strong><br><br>
    29" ist die effizientere Wahl für XC-Fahrer und alle die viel Strecke machen – bergauf, auf langen Trails, bei höheren Geschwindigkeiten. Das Rad rollt besser und ermüdet weniger. Für größere Fahrer ab etwa 175 cm passt 29" auch geometrisch gut.<br><br>
    27,5" ist agiler, direkter in der Reaktion und macht besonders im technischen Gelände Spaß. Engere Kurven, schnelle Richtungswechsel, verspieltes Fahren auf kurzen Trails – das liegt 27,5" besser. Für kleinere Fahrer unter 175 cm ist 27,5" oft auch die sinnvollere Wahl, weil ein 29"-Rahmen in kleinen Größen geometrische Kompromisse erzwingt.<br><br>
    <strong>Das Mullet-Setup als dritte Option</strong><br><br>
    Wer das Beste aus beiden Welten will, greift zum Mullet-Setup: 29" vorne, 27,5" hinten. Das größere Vorderrad rollt ruhiger über Hindernisse und gibt Sicherheit bergab, das kleinere Hinterrad sorgt für Agilität und ermöglicht engere Kurvenradien. Dieses Setup hat sich in den letzten Jahren besonders im Trail- und Enduro-Bereich etabliert – nicht als Kompromiss, sondern als bewusste Entscheidung.<br><br>
    <strong>Zusammengefasst</strong><br><br>
    Es gibt keine universell richtige Antwort. Wer viel Strecke fährt und Effizienz schätzt, liegt mit 29" richtig. Wer technische Trails mag und Agilität sucht, greift zu 27,5". Und wer sich nicht entscheiden kann oder will – der fährt Mullet.`
  },
  haendler_vs_online: {
    frage: 'Händler oder Online kaufen – wo kaufe ich besser?',
    antwort: `Diese Frage lässt sich nicht pauschal beantworten – sie hängt davon ab, wie viel Erfahrung du mitbringst und was du vom Kauf erwartest.<br><br>
    Ein Fahrradhändler vor Ort bietet dir Beratung, eine Probefahrt und einen Ansprechpartner wenn etwas nicht passt. Du kannst das Rad anfassen, sitzen, fahren – und direkt entscheiden. Das hat seinen Preis. Der Händler-Aufschlag ist real, aber für viele Menschen gut investiert. Wer sein Rad bei Problemen einfach abgeben und abholen will, ist beim Händler richtig.<br><br>
    Online-Direktversender wie Canyon oder Rose bieten in vielen Fällen mehr Rad fürs gleiche Geld – weil der Handel-Aufschlag entfällt. Das ist ein echter Vorteil. Der Nachteil: keine Probefahrt, kein lokaler Service, und bei Problemen bist du auf dich allein gestellt oder wickelst alles über den Versand ab.<br><br>
    Meine Empfehlung ist einfach: Wer selbst schraubt oder eine gute Werkstatt in der Nähe hat – kauft online und spart. Wer das Rad immer zum Händler bringt und persönlichen Service braucht – kauft beim Händler. Beides ist richtig. Es kommt auf die Situation an.`
  },
  budget: {
    frage: 'Was ist ein realistisches Budget für ein gutes Fahrrad?',
    antwort: `Die ehrliche Antwort: Es gibt kein universelles Budget – aber es gibt eine Untergrenze, unter der man sich Probleme kauft statt ein Fahrrad.<br><br>
    Räder im untersten Preissegment haben oft minderwertige Bremsen, schwere Rahmen und Schaltungen die sich kaum einstellen lassen und schnell verschleißen. Das Rad macht keinen Spaß, kostet in der Wartung unverhältnismäßig viel – und landet oft nach kurzer Zeit ungenutzt im Keller.<br><br>
    Als grobe Orientierung: Wer gelegentlich fährt, ist mit einem soliden Einsteiger-Rad gut bedient. Wer regelmäßig unterwegs ist – ob im Alltag oder sportlich – sollte in die Mittelklasse investieren. Hydraulische Scheibenbremsen, eine anständige Schaltung und ein Rahmen der mehrere Jahre hält, sind hier Standard. Wer sehr viel fährt oder sportlich ambitioniert ist, bekommt in der oberen Mittelklasse wirklich gute Technik. Alles darüber ist Spezialisierung – leichter, präziser, teurer. Nur sinnvoll wenn man weiß warum man es braucht.<br><br>
    Die wichtigste Faustregel: Lieber einmal richtig kaufen als zweimal. Ein gutes Rad macht mehr Freude, hält länger und kostet weniger in der Wartung.`
  },
  hardtail_vs_fully: {
    frage: 'Hardtail oder Fully – was brauche ich wirklich?',
    antwort: `Ein Fully – also ein vollgefedertes Mountainbike – klingt zunächst nach der besseren Wahl. Mehr Federung, mehr Komfort, mehr Kontrolle. Das stimmt – aber nur wenn das Rad auch dazu passt, wie und wo man fährt.<br><br>
    Ein Hardtail hat nur eine Federgabel vorne, keinen Hinterbau-Dämpfer. Das macht es leichter, steifer und effizienter beim Treten – besonders bergauf und auf schnellen Schotterwegen. Wartung und Kosten sind deutlich geringer, weil der Dämpfer am Hinterbau entfällt. Für Einsteiger, XC-Fahrer und alle die viel Strecke machen, ist ein Hardtail oft die vernünftigere Wahl.<br><br>
    Ein Fully macht dann Sinn, wenn man wirklich technische Trails fährt – also Singletrails mit Wurzeln, Felsen, Drops und Sprüngen. Der Hinterbau-Dämpfer schluckt Unebenheiten, gibt mehr Grip am Hinterrad und macht das Rad stabiler bergab. Wer das nicht braucht, zahlt für Technik die ihm keinen Vorteil bringt.<br><br>
    Die häufigste Fehlentscheidung ist ein billiges Fully. Ein günstiges Fully mit schlechtem Fahrwerk ist in fast allen Situationen schlechter als ein gutes Hardtail. Das Geld ist am falschen Ort investiert. Wer ein Fully will, sollte bereit sein dafür zu zahlen – und den regelmäßigen Fahrwerk-Service einkalkulieren.`
  },
  alu_vs_carbon: {
    frage: 'Aluminium oder Carbon – lohnt sich der Aufpreis?',
    antwort: `Carbon ist leichter, steifer und dämpft Vibrationen besser als Aluminium. Das sind Fakten. Aber die Frage ist nicht ob Carbon besser ist – die Frage ist ob der Unterschied für den jeweiligen Fahrer und Einsatz relevant ist.<br><br>
    Ein guter Aluminium-Rahmen ist robust, günstig in der Reparatur und verträgt Stürze und Kratzer ohne dass man sich sofort Sorgen macht. Aluminium rostet nicht, ist weltweit verfügbar und lässt sich in jeder Werkstatt bearbeiten. Für den Alltag, für Einsteiger und für alle die kein Rennen fahren, ist Aluminium die vernünftigere Wahl.<br><br>
    Carbon bringt spürbaren Vorteil dort wo Gewicht und Steifigkeit wirklich eine Rolle spielen – also im Rennsport, bei langen sportlichen Ausfahrten oder wenn man bewusst in Leistung investiert. Carbon verzeiht keine Fehler: ein harter Sturz oder ein falsches Einspannen im Werkzeug kann einen Riss verursachen der von außen unsichtbar ist. Das Rad muss dann geprüft werden – im Zweifel ist es Schrott.<br><br>
    Meine Einschätzung: Wer unter 80 kg ist, viel fährt und Leistung schätzt – Carbon macht Sinn. Für alle anderen ist ein hochwertiger Aluminium-Rahmen die ehrlichere Wahl. Das gesparte Geld ist in besseren Komponenten deutlich besser investiert.`
  },
  ebike_wann: {
    frage: 'E-Bike – wann macht es wirklich Sinn?',
    antwort: `Ein E-Bike ist kein Schummeln und kein Luxusprodukt. Es ist ein Werkzeug – und wie jedes Werkzeug macht es dort Sinn, wo es die Aufgabe besser erledigt als die Alternative.<br><br>
    Ein E-Bike macht Sinn wenn das Fahrrad ohne Motor schlicht nicht genutzt würde. Lange Strecken, viele Höhenmeter, körperliche Einschränkungen, Gepäck oder das Rad als Autoersatz – das sind Situationen in denen der Motor einen echten Unterschied macht. Wer damit 5 km zur Arbeit fährt, auf flachem Terrain und ohne gesundheitliche Einschränkungen, braucht kein E-Bike.<br><br>
    Was viele nicht einkalkulieren: Ein E-Bike ist schwerer, teurer in der Anschaffung und teurer in der Wartung. Bremsen und Reifen verschleißen schneller weil man schneller fährt und mehr Gewicht bremst. Der Akku ist ein Verschleißteil mit begrenzter Lebensdauer – nach 3 bis 7 Jahren ist ein Ersatz fällig. Das gehört in die Gesamtrechnung.<br><br>
    Wer ein E-Bike kauft, sollte auf einen etablierten Antrieb achten – Bosch, Shimano Steps oder Brose. Bei unbekannten Eigenentwicklungen ist die Ersatzteilversorgung in fünf Jahren unsicher. Das kann teuer werden.`
  },
  gebraucht_kaufen: {
    frage: 'Gebrauchtes Fahrrad kaufen – worauf muss ich achten?',
    antwort: `Ein gebrauchtes Fahrrad kann ein sehr guter Kauf sein – oder eine teure Enttäuschung. Der Unterschied liegt darin, was man vor dem Kauf prüft.<br><br>
    Das Wichtigste zuerst: der Rahmen. Risse, Dellen oder Knicke am Rahmen sind ein absolutes Ausschlusskriterium – besonders bei Carbon, wo Schäden von außen oft unsichtbar sind. Bei Aluminium sieht man Schäden meist deutlicher, aber auch hier gilt: Im Zweifel nicht kaufen.<br><br>
    Die Kette ist der beste Hinweis auf den Pflegezustand des gesamten Rades. Eine stark verschlissene oder verrostete Kette zeigt, dass das Rad wenig oder gar nicht gepflegt wurde. Das zieht sich in der Regel durch alle anderen Komponenten.<br><br>
    Bremsen prüfen: Belagdicke, Rotorzustand, ob die Bremse zieht ohne zu schleifen. Schaltung: sauber und präzise schalten, kein Springen auf der Kassette. Federung: Gabel auf Ölaustritt und gleichmäßiges Einfedern prüfen.<br><br>
    Was man nicht kaufen sollte: Räder ohne Herkunftsnachweis bei auffällig niedrigem Preis. Gestohlene Fahrräder sind ein echtes Problem im Gebrauchtmarkt. Ein seriöser Verkäufer hat Kaufbeleg oder Rahmennummer parat.`
  },
  shimano_vs_sram: {
    frage: 'Shimano oder SRAM – was ist besser?',
    antwort: `Beide Hersteller bauen sehr gute Schaltungen. Die Frage ist nicht welche besser ist – sondern welche besser zu dir passt.<br><br>
    Shimano ist der Weltmarktführer mit dem größten Händlernetz. Ersatzteile sind überall verfügbar, jede Werkstatt kennt Shimano in- und auswendig, und die Schaltungen sind bekannt für ihre Zuverlässigkeit und einfache Wartung. Für Einsteiger und alle die ihr Rad zur Werkstatt bringen, ist Shimano die unkompliziertere Wahl.<br><br>
    SRAM bietet oft leichtere Komponenten, eine andere Ergonomie am Schalthebel und mit dem AXS-System eine der besten elektronischen Schaltungen am Markt. Wer SRAM kennt und schätzt, bleibt dabei – aber Ersatzteile sind teurer, und nicht jede Werkstatt ist gleich gut aufgestellt.<br><br>
    Meine Empfehlung: Wer keine Präferenz hat, fängt mit Shimano an. Die Lernkurve ist flacher, die Verfügbarkeit besser, die Kosten geringer. Wer gezielt zu SRAM wechselt, sollte wissen warum – und bereit sein, das zu bezahlen.`
  },
  einfach_vs_zweifach: {
    frage: '1-fach oder 2-fach Antrieb – was brauche ich?',
    antwort: `Vor einigen Jahren war 2-fach – also zwei Kettenblätter vorne – der Standard. Heute ist 1-fach bei MTBs die Regel, und auch bei Gravelbikes und Trekkingrädern immer häufiger zu finden. Der Grund ist einfach: moderne Kassetten mit großer Übersetzungsbandbreite machen einen Umwerfer in vielen Fällen überflüssig.<br><br>
    1-fach ist einfacher, leichter und wartungsärmer. Kein Umwerfer, kein zusätzliches Schaltseil, weniger Fehlerquellen. Die Schaltung ist schneller bedienbar weil man nur einen Schalthebel hat. Für MTBs und sportliche Einsätze ist 1-fach heute die klare Empfehlung.<br><br>
    2-fach macht noch Sinn wenn man sehr fein abgestufte Übersetzungen braucht – also im Rennrad- und Zeitfahrbereich, oder wenn man sehr flaches und sehr steiles Gelände kombiniert und dabei jeden Zahn der Kassette optimal nutzen will. Für die meisten Alltagsfahrer und Freizeitsportler ist der Vorteil von 2-fach heute kaum noch spürbar.`
  },
  tubeless: {
    frage: 'Tubeless – lohnt sich der Aufwand?',
    antwort: `Tubeless bedeutet: kein Schlauch im Reifen. Die Luft wird direkt im Reifen gehalten, abgedichtet durch ein spezielles Felgenband, ein Ventil und eine Dichtmilch im Reifen.<br><br>
    Der größte Vorteil ist der niedrigere Luftdruck. Ohne Schlauch kann man weniger Druck fahren ohne das Risiko eines Plattfußes durch einen eingeklemmten Schlauch – das verbessert den Grip und den Fahrkomfort spürbar, besonders im Gelände. Kleine Einstiche durch Dornen oder Glassplitter werden von der Dichtmilch automatisch geschlossen.<br><br>
    Der Aufwand beim Aufziehen ist höher als bei einem normalen Reifen – besonders beim ersten Mal. Die Dichtmilch muss alle drei bis sechs Monate erneuert werden, sonst trocknet sie aus und verliert ihre Wirkung. Bei einem größeren Riss hilft nur ein Schlauch als Notlösung – den sollte man trotzdem dabei haben.<br><br>
    Meine Einschätzung: Für MTBs und Gravelbikes lohnt sich Tubeless klar. Für Rennräder ist es sinnvoll wenn man bereit ist für den Aufwand beim Setup. Für Trekking- und Alltagsräder auf befestigtem Untergrund ist der Aufwand größer als der Nutzen.`
  },
  federweg: {
    frage: 'Welche Federweglänge brauche ich wirklich?',
    antwort: `Federweg ist die Strecke die eine Federgabel oder ein Hinterbau-Dämpfer einfedert. Mehr Federweg bedeutet mehr Potenzial für grobes Gelände – aber auch mehr Gewicht, mehr Wartungsaufwand und eine veränderte Geometrie des Rades.<br><br>
    Für XC und schnelle Schotterwege reichen 100 bis 120 mm. Das Rad bleibt effizient und reaktionsschnell. Für Trail-Fahren im gemischten Gelände sind 130 bis 150 mm der sinnvolle Bereich. Wer viel bergab fährt, technische Trails mit Drops und Sprüngen nutzt oder im Enduro-Bereich unterwegs ist, braucht 160 mm oder mehr.<br><br>
    Der häufigste Fehler ist zu viel Federweg für zu wenig Gelände. Ein Rad mit 170 mm Federweg auf Forstwegen und gelegentlichem Singletrail ist schwerer, träger und weniger effizient als es sein müsste. Federweg kostet immer etwas – an Gewicht, Effizienz und Wartungsaufwand. Man sollte nur so viel nehmen wie man wirklich braucht.`
  },
  luftdruck: {
    frage: 'Luftdruck in Reifen – wie viel ist richtig?',
    antwort: `Es gibt keine universelle Antwort – der richtige Luftdruck hängt vom Fahrergewicht, dem Reifenquerschnitt, dem Untergrund und dem persönlichen Fahrgefühl ab.<br><br>
    Als Ausgangspunkt gilt: Schmalere Reifen brauchen mehr Druck, breite Reifen weniger. Schwere Fahrer fahren mehr Druck als leichte. Auf hartem Untergrund fährt man mehr Druck als im losen Gelände. Die meisten Reifenhersteller drucken einen Mindest- und Höchstwert auf die Reifenflanke – das ist der technisch zulässige Bereich, nicht die Empfehlung für optimale Performance.<br><br>
    Der beste Weg zum richtigen Druck ist ausprobieren. Wer zu viel Druck fährt, spürt jeden Stein – das Rad hüpft statt zu rollen. Wer zu wenig Druck fährt, riskiert bei Schläuchen einen Platten durch einen eingeklemmten Schlauch, und das Fahrverhalten wird schwammig. Tubeless-Fahrer können generell etwas weniger Druck fahren als mit Schlauch.<br><br>
    Ein gutes Reifendruckmessgerät ist eine sinnvolle Investition. Der eingebaute Druckmesser an der Pumpe ist oft ungenau.`
  },
  wartung_intervall: {
    frage: 'Wie oft muss ein Fahrrad gewartet werden?',
    antwort: `Öfter als die meisten denken – und weniger aufwendig als viele befürchten.<br><br>
    Das Wichtigste ist die Kette. Eine verschmutzte oder trockene Kette verschleißt sich selbst und nimmt dabei Kassette und Kettenblatt mit. Wer die Kette nach Fahrten im Regen oder Schmutz reinigt und regelmäßig ölt, verlängert die Lebensdauer aller Antriebskomponenten erheblich. Das dauert wenige Minuten und spart im Laufe der Zeit viel Geld.<br><br>
    Die Bremsen sollte man regelmäßig auf Belagdicke und Funktion prüfen. Hydraulische Bremsen brauchen in der Regel alle ein bis zwei Jahre frisches Bremsöl. Schaltung und Züge verstellen sich über die Zeit – wer das früh erkennt und nachstellt, vermeidet größere Probleme.<br><br>
    Eine jährliche Komplettkontrolle beim Händler ist sinnvoll – auch für jemanden der selbst schraubt. Ein zweites Paar Augen findet Dinge die man selbst übersieht. Wer eine Federgabel hat, sollte deren Serviceintervall kennen und einhalten.`
  },
  kette: {
    frage: 'Wann muss die Kette gewechselt werden?',
    antwort: `Rechtzeitig – und nicht erst wenn sie reißt oder die Schaltung anfängt zu springen.<br><br>
    Eine Kette verschleißt durch Dehnung. Die einzelnen Glieder werden länger, passen nicht mehr exakt auf die Zähne von Kassette und Kettenblatt – und fressen sich dort hinein. Wer eine gedehnte Kette zu lange fährt, wechselt am Ende nicht nur die Kette sondern auch Kassette und Kettenblatt gleichzeitig. Das ist deutlich teurer.<br><br>
    Den Verschleiß misst man mit einer Kettenmesslehre – ein einfaches Werkzeug das es für wenige Euro gibt. Zeigt die Lehre 0,75 % Dehnung an, ist es Zeit für eine neue Kette. Bei 1,0 % ist die Kassette mit hoher Wahrscheinlichkeit auch fällig.<br><br>
    Wann das passiert hängt von der Pflege, dem Untergrund und dem Fahrstil ab. Wer die Kette regelmäßig reinigt und ölt, kommt deutlich weiter als jemand der das nie macht. Eine Kettenmesslehre im Werkzeugkasten zu haben und alle paar Wochen kurz nachzuschauen ist die günstigste Wartungsmaßnahme am Fahrrad.`
  },
  gesamtkosten: {
    frage: 'Was kostet mich ein Fahrrad wirklich – Anschaffung und laufende Kosten?',
    antwort: `Der Kaufpreis ist nur der Anfang. Ein Fahrrad hat laufende Kosten die man vor dem Kauf kennen sollte.<br><br>
    Verschleißteile wie Kette, Kassette, Bremsbeläge und Reifen müssen regelmäßig getauscht werden. Das ist normal und unvermeidbar. Wer die Kette rechtzeitig wechselt, schont die Kassette – und spart damit. Wer wartet bis alles verschlissen ist, zahlt mehr auf einmal.<br><br>
    Dazu kommen Wartungskosten: jährliche Inspektion beim Händler, bei Federgabeln der regelmäßige Service, bei hydraulischen Bremsen das Nachfüllen oder Wechseln des Öls. Das ist keine große Summe pro Jahr – aber sie gehört in die Rechnung.<br><br>
    Ein teures Rad hat oft günstigere laufende Kosten als ein billiges. Hochwertigere Komponenten halten länger, sind präziser einzustellen und haben günstigere Ersatzteile im Verhältnis zur Lebensdauer. Ein billiges Rad das ständig zur Werkstatt muss, ist am Ende teurer als ein einmalig gut investiertes Budget.`
  },
  federgabel_service: {
    frage: 'Federgabel – wann muss sie gewartet werden?',
    antwort: `Eine Federgabel ist ein wartungsintensives Bauteil – das wird beim Kauf selten erwähnt und von den meisten Fahrern jahrelang ignoriert. Das rächt sich.<br><br>
    Im Inneren der Federgabel befindet sich Öl. Dieses Öl schmiert die beweglichen Teile, dämpft die Federbewegung und schützt die Dichtungen. Mit der Zeit altert das Öl, verliert seine Eigenschaften und wird dünnflüssiger. Die Gabel wird langsamer, unpräziser – in Extremfällen schädigt das verbrauchte Öl die Dichtungen, und die sind teuer.<br><br>
    Die meisten Hersteller empfehlen ein Serviceintervall von 100 bis 200 Betriebsstunden. Das klingt viel – ist es aber nicht wenn man regelmäßig fährt. Ein einfaches Service der unteren Beinchen kostet in der Werkstatt einen überschaubaren Betrag und sollte einmal im Jahr gemacht werden. Ein vollständiges Serviceintervall inklusive Dämpferkartusche ist aufwendiger und teurer, aber bei intensiver Nutzung nach ein bis zwei Jahren sinnvoll.<br><br>
    Erkennungszeichen für fälliges Service: Öl auf den Standrohren, Geräusche beim Einfedern, deutlich schlechteres Ansprechverhalten als früher.`
  },
  selbst_warten: {
    frage: 'Kann ich mein Fahrrad selbst warten oder brauche ich eine Werkstatt?',
    antwort: `Beides ist möglich – und es muss keine Entscheidung für das eine oder andere sein.<br><br>
    Einfache Wartungsarbeiten kann praktisch jeder selbst erledigen: Kette reinigen und ölen, Luftdruck prüfen, Schaltung nachjustieren, Bremsbeläge kontrollieren. Das braucht kein teures Werkzeug, lässt sich mit ein paar YouTube-Videos lernen und spart über die Jahre eine Menge Geld.<br><br>
    Komplexere Arbeiten wie das Entlüften hydraulischer Bremsen, der Service einer Federgabel oder das Einstellen eines Lagers erfordern mehr Erfahrung und spezifisches Werkzeug. Wer das lernen will – sehr gut. Wer es nicht will – kein Problem. Dafür gibt es Werkstätten.<br><br>
    Der praktischste Ansatz für die meisten Fahrer: Routine-Pflege selbst machen, komplexe Eingriffe zur Werkstatt bringen. Das spart Geld ohne das Rad zu riskieren. Und eine jährliche Inspektion beim Händler ist auch für erfahrene Selbstschrauber sinnvoll – ein zweites Paar Augen findet Dinge die man selbst übersieht.`
  },
  kauffehler: {
    frage: 'Welche Fehler machen die meisten beim ersten Fahrradkauf?',
    antwort: `Der häufigste Fehler ist das falsche Rad für den falschen Einsatz. Ein vollgefedertes Mountainbike für den Weg zur Arbeit, ein Trekkingrad für sportliche Trails, ein Rennrad für Schotterwege – Räder sind für bestimmte Einsatzbereiche entwickelt und funktionieren außerhalb davon schlechter. Der erste Schritt vor jedem Kauf sollte immer die ehrliche Antwort auf die Frage sein: Wo und wie fahre ich wirklich – nicht wie ich gerne fahren würde.<br><br>
    Der zweite häufige Fehler ist zu wenig Budget. Ein billiges Fahrrad ist selten ein gutes Geschäft. Minderwertige Bremsen, eine Schaltung die sich nicht sauber einstellen lässt, ein Rahmen der nach zwei Jahren Probleme macht – das ist keine Ersparnis sondern ein aufgeschobener Mehraufwand.<br><br>
    Der dritte Fehler ist, die Größe zu ignorieren. Ein falsch großes Rad macht keinen Spaß, belastet Rücken und Gelenke und lässt sich nicht sicher fahren. Rahmengröße, Schrittlänge und Körpergröße gehören zusammen – und kein Händler der wirklich berät, überspringt diesen Schritt.`
  },
  billig_teurer: {
    frage: 'Warum ist billig oft teurer?',
    antwort: `Weil ein billiges Fahrrad fast immer höhere Folgekosten hat als ein teureres.<br><br>
    Günstige Schaltungen verschleißen schneller und sind schwerer einzustellen. Günstige Bremsen haben weniger Bremsleistung und kürzere Belag-Lebensdauern. Günstige Rahmen sind schwerer und weniger steif – was das Fahren weniger effizient und weniger angenehm macht. Günstige Lager laufen kürzer, günstige Züge rosten schneller, günstige Reifen greifen schlechter.<br><br>
    Das bedeutet nicht, dass jedes günstige Rad schlecht ist. Aber es bedeutet, dass man für wenig Geld in der Regel Kompromisse kauft – und diese Kompromisse haben einen Preis, der sich über die Zeit in Wartungskosten, Ersatzteilen und Enttäuschung ausdrückt.<br><br>
    Das teuerste Fahrrad ist das, das man nicht benutzt weil es keinen Spaß macht. Und das zweitteuerste ist das, das ständig Probleme macht. Ein einmalig gut investiertes Budget ist fast immer die günstigere Entscheidung auf lange Sicht.`
  },
  helm_alter_und_kauf: {
    frage: 'Fahrradhelm – wie alt darf er sein, und worauf kommt es wirklich an?',
    antwort: `Ein Helm der zehn Jahre alt ist und nie runtergefallen ist, sieht von außen gut aus. Er schützt dich aber nicht mehr so wie am ersten Tag. Warum – und was du wirklich wissen musst.<br><br>
    <strong>Wie alt darf ein Helm sein?</strong><br><br>
    Die offizielle Empfehlung der meisten Hersteller – darunter Giro, Bell, Scott und Uvex – lautet: <strong>maximal 5 Jahre ab Kaufdatum, oder sofort nach einem Sturz.</strong> Das klingt streng, hat aber einen guten Grund: Das Styropor im Inneren des Helms (EPS – Expanded Polystyrene) altert. UV-Strahlung, Schweiß, Reinigungsmittel und Temperaturschwankungen greifen das Material an – unsichtbar, aber messbar. Ein alter Helm bricht bei einem Aufprall anders als ein neuer – und das bedeutet weniger Schutz für deinen Kopf.<br><br>
    Faustregel: Wer seinen Helm nicht mehr datieren kann oder ihn gebraucht gekauft hat, sollte ihn ersetzen.<br><br>
    <strong>Nach einem Sturz: sofort wechseln</strong><br><br>
    Das ist kein Marketing-Trick der Hersteller. EPS ist ein Einweg-Dämpfungsmaterial: Es absorbiert die Aufprallenergie beim ersten Einschlag – danach ist es dauerhaft verformt, auch wenn von außen nichts zu sehen ist. Wer nach einem Sturz mit demselben Helm weiterfährt, riskiert beim nächsten Aufprall ungeschützt zu sein. Manche Hersteller (z. B. Specialized, Trek) bieten einen kostengünstigen Crash-Replacement-Service an – das lohnt sich zu kennen.<br><br>
    <strong>Welche Norm ist Pflicht?</strong><br><br>
    In Europa gilt für Fahrradhelme die Norm <strong>EN 1078</strong>. Jeder im Handel erhältliche Helm muss diese Norm erfüllen – das ist gesetzlich vorgeschrieben. Auf dem Helm selbst (meist innen) ist das CE-Zeichen mit der Norm aufgedruckt. Wer einen Helm kauft, der kein CE-Zeichen trägt, kauft keinen Schutz.<br><br>
    Darüber hinaus gibt es freiwillige Tests wie den <strong>MIPS-Standard</strong> (Multi-directional Impact Protection System) – eine zusätzliche Schicht im Helm, die bei schrägen Aufprällen die Rotationskräfte auf das Gehirn reduziert. MIPS ist kein Pflichtstandard, aber sinnvoll – besonders für MTB- und Gravel-Fahrer die auch im Gelände unterwegs sind. Mittlerweile ist MIPS auch in vielen erschwinglichen Helmen erhältlich.<br><br>
    <strong>Passform – das wichtigste Kaufkriterium</strong><br><br>
    Ein Helm der nicht sitzt, schützt nicht. Ein Helm muss fest am Kopf anliegen – kein Wackeln nach vorne, hinten oder seitlich. Der Kinnriemen schließt direkt unter dem Kinn, mit einem Finger Luft dazwischen. Die Verstellspindel am Hinterkopf wird so fest gedreht, dass der Helm nicht mehr nach vorne rutscht wenn man den Kopf neigt.<br><br>
    Kopfformen sind unterschiedlich: manche Köpfe sind runder, andere eher oval. Nicht jeder Helm passt zu jeder Kopfform – auch wenn die Umfangsgröße stimmt. Wer die Möglichkeit hat, sollte Helme immer vor dem Kauf anprobieren.<br><br>
    <strong>Preis und Qualität</strong><br><br>
    Ein teurer Helm ist nicht zwingend sicherer als ein günstiger – beide müssen dieselbe Norm erfüllen. Was ein höherer Preis bringt: mehr Belüftung (mehr Luft, weniger Material → leichter und kühler), bessere Verarbeitungsqualität, MIPS, und in vielen Fällen eine bessere Passform-Anpassung. Für gelegentliche Stadtfahrten reicht ein solider Einsteiger-Helm. Für sportliche Einsätze, lange Ausfahrten oder Geländefahrten lohnt sich mehr Investition – weil Komfort und Passform hier direkt die Sicherheit beeinflussen.<br><br>
    <strong>Zusammengefasst</strong><br><br>
    Maximales Helmalter: 5 Jahre. Nach jedem Sturz mit Aufprall: sofort ersetzen. CE-Zeichen mit EN 1078 ist Pflicht. MIPS ist sinnvoll. Und das wichtigste Kaufkriterium ist nicht der Preis – sondern die Passform.`
  },
  reifendruck_8bar: {
    frage: 'Rennradreifen mit 8 bar – stimmt diese Empfehlung noch?',
    antwort: `Die kurze Antwort: Nein – zumindest nicht pauschal. 8 bar war jahrzehntelang die Standardempfehlung für schmale Rennradreifen. Sie ist aber mittlerweile wissenschaftlich überholt.<br><br>
    <strong>Woher kommt die „8 bar"-Regel?</strong><br><br>
    Die Empfehlung stammt ursprünglich aus dem Bahnradsport – also aus dem Velodrom, auf spiegelglattem Betonboden. Dort gilt tatsächlich: mehr Druck = weniger Walkarbeit = weniger Rollwiderstand. Diese Erkenntnis wurde damals unkritisch auf den Straßeneinsatz übertragen und hat sich als Faustregel festgesetzt.<br><br>
    <strong>Was die moderne Forschung zeigt</strong><br><br>
    Forscher wie Jan Heine (Rene Herse Cycles), das SILCA-Team und Schwalbe haben in den letzten 15 Jahren nachgewiesen, dass auf echten Straßenbelägen das Gegenteil gilt: Zu viel Druck lässt den Reifen über Mikro-Unebenheiten <em>hüpfen</em> statt darüber zu rollen. Das kostet Energie, verschlechtert die Bodenhaftung – besonders bei Nässe – und erhöht den Reifenverschleiß.<br><br>
    Der optimale Druck liegt dort, wo der Reifen gerade genug nachgeben kann, um sich an den Belag anzupassen. Auf realen Straßen ist das ein spürbar niedrigerer Wert als das aufgedruckte Maximum.<br><br>
    <strong>Was moderne Empfehlungen sagen</strong><br><br>
    Für einen Fahrer mit 80 kg Körpergewicht auf 23 mm schmalen Reifen empfehlen SILCA und Schwalbe heute rund <strong>6,0–6,5 bar vorne, 7,0–7,5 bar hinten</strong>. 8 bar werden erst ab etwa 90–95 kg Fahrergewicht sinnvoll – und auch dann nur auf sehr glattem Asphalt.<br><br>
    Das Hinterrad bekommt übrigens immer etwas mehr Druck als das Vorderrad, weil es rund 57 % des Systemgewichts trägt. Das Vorderrad entsprechend weniger – ein Detail, das bei der alten Einheitsempfehlung von „8 bar" komplett ignoriert wurde.<br><br>
    <strong>Die Empfehlung des Luftdruck-Rechners</strong><br><br>
    Der Rechner in diesem Tool basiert auf den aktuellen Daten von Schwalbe Pressure Prof, SILCA Pro Calculator und dem ADAC-Reifendruckguide 2026. Er gibt dir gewichts- und reifenspezifische Werte aus – getrennt für Vorder- und Hinterrad. Das ist präziser als jede Faustregel.`
  }
};

// ---- FAQ KATEGORIEN ----
const faqKategorien = [
  {
    label: '🏭 Hersteller & Marken',
    keys: ['hersteller_allgemein']
  },
  {
    label: '🛒 Kauf & Entscheidung',
    keys: ['haendler_vs_online','budget','hardtail_vs_fully','alu_vs_carbon','ebike_wann','gebraucht_kaufen','kauffehler','billig_teurer','helm_alter_und_kauf']
  },
  {
    label: '⚙️ Technik & Komponenten',
    keys: ['laufradgroesse','shimano_vs_sram','einfach_vs_zweifach','tubeless','federweg','luftdruck','reifendruck_8bar']
  },
  {
    label: '🔧 Wartung & Kosten',
    keys: ['wartung_intervall','kette','gesamtkosten','federgabel_service','selbst_warten']
  }
];

function renderFaqAccordion() {
  const container = document.getElementById('faq-accordion');
  if (!container) return;
  let html = '';
  faqKategorien.forEach((kat, ki) => {
    html += `<div style="margin-bottom:8px;">
      <div style="font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:var(--text-dim); padding:10px 0 6px; border-bottom:1px solid var(--cream2); margin-bottom:4px;">${kat.label}</div>`;
    kat.keys.forEach(key => {
      const item = faqData[key];
      if (!item) return;
      html += `<div class="faq-item" id="faq-item-${key}">
        <button type="button" class="faq-q" onclick="toggleFaq('${key}')">
          <span>${item.frage}</span>
          <span class="faq-chevron" id="faq-chev-${key}">›</span>
        </button>
        <div class="faq-a" id="faq-a-${key}" style="display:none;">
          <div class="faq-a-inner">${item.antwort}</div>
          <div style="margin-top:12px; padding-top:10px; border-top:1px solid var(--cream2); font-size:11px; color:var(--text-dim); font-style:italic;">Keine bezahlten Empfehlungen. Keine Werbung. Meine persönliche Meinung nach Jahren im Fahrradhandel.</div>
        </div>
      </div>`;
    });
    html += `</div>`;
  });
  container.innerHTML = html;
}
// renderFaqAccordion() wird via DOMContentLoaded aufgerufen

let openFaqKey = null;
function toggleFaq(key) {
  if (openFaqKey && openFaqKey !== key) {
    document.getElementById('faq-a-' + openFaqKey).style.display = 'none';
    document.getElementById('faq-chev-' + openFaqKey).style.transform = 'rotate(0deg)';
  }
  const panel = document.getElementById('faq-a-' + key);
  const chev = document.getElementById('faq-chev-' + key);
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  chev.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(90deg)';
  openFaqKey = isOpen ? null : key;
  if (!isOpen) {
    setTimeout(() => document.getElementById('faq-item-' + key).scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }
}
function restartWizard() {
  answers = { 's_alter': 35, 's_gewicht': 80, 's_groesse': 175, 's_schrittl': 80, 's_armlaenge': 55,
              's_t1': 40, 's_t2': 30, 's_t3': 20, 's_t4': 10 };
  stepperData.alter = 35;
  document.getElementById('alter-val').textContent = 35;
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.opt, .opt-grid').forEach(o => o.classList.remove('selected'));
  document.querySelectorAll('[id^="next-"]').forEach(b => { if (b.tagName === 'BUTTON') b.disabled = false; });
  document.getElementById('next-8').disabled = true;
  document.getElementById('next-9').disabled = true;
  document.getElementById('next-10').disabled = true;
  document.getElementById('next-11').disabled = true;
  document.getElementById('next-6-btn').disabled = true;
  document.getElementById('step-1').classList.add('active');
  updateProgress(1);
  window.scrollTo(0, 0);
}

