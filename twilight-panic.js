(function () {
  var TEAMS_URL = 'https://teams.microsoft.com/l/chat/19:07aecb96147b409ab39d5b16292e0d26@thread.v2/conversations?context=%7B%22contextType%22%3A%22chat%22%7D';
  var fab = document.getElementById('panicFab');
  var btn = document.getElementById('panicBtn');
  var menu = document.getElementById('panicMenu');
  var overlay = document.getElementById('panicOverlay');
  var modalTitle = document.getElementById('panicModalTitle');
  var modalBody = document.getElementById('panicModalBody');
  var modalClose = document.getElementById('panicModalClose');
  if (!fab || !btn || !menu) return;

  // Troubleshooting = SOP Section 14 (Troubleshooting Tips) + Section 15 (FAQ).
  var TROUBLESHOOTING_HTML =
    '<h3>14.1 Network Troubleshooting</h3>' +
    '<p>Ideally, the download speed should be around 75 Mbps or higher. Anything under that tends to cause issues (feeds take too long to load or don\u2019t load at all, video may be too blurry for usable data).</p>' +
    '<p><strong>Primary method:</strong> Connect the Eero router to the participant\u2019s router using the ethernet cable.</p>' +
    '<p>If the Eero won\u2019t connect or the network is too weak, follow the steps below in order:</p>' +
    '<p><strong>Option 1: Eero Bridge Mode</strong><br>Use this if the customer does NOT have the newest Xfinity router. Do this BEFORE connecting ethernet to the participant\u2019s router.</p>' +
    '<ol><li>Open the Eero app.</li><li>Go to your router &gt; Settings &gt; Advanced Networking &gt; DHCP &amp; NAT.</li><li>Switch to Bridge.</li><li>Let it restart.</li><li>Once it says \u201CNo Internet,\u201D unplug the Eero.</li><li>Connect the ethernet cable to the participant\u2019s router.</li><li>Plug the Eero back in. It should connect.</li></ol>' +
    '<p>If this doesn\u2019t work and the provider is not Xfinity (red light on Eero), switch back to Automatic.</p>' +
    '<p><strong>Option 2: Xfinity with No Separate Router</strong><br>If the customer has Xfinity with no router of their own (e.g., no TP Link or Eero connected) and Eero bridge mode fails:</p>' +
    '<ul><li>Follow this SOP: Participant Guide - Temporary WiFi Setup (Bridge Mode)</li><li>Make sure the customer has a laptop or computer available to hardwire back into their router.</li></ul>' +
    '<p><strong>Option 3: Connect Cameras Directly to Home WiFi (Last Resort)</strong><br>If the Eero and bridge mode both fail:</p>' +
    '<ol><li>Log in to the Ring app and select your location.</li><li>On the dashboard, click the 3-dot menu &gt; Device Settings.</li><li>Go to Device Health &gt; Change Network.</li><li>Follow the on-screen instructions and select the home WiFi (you will need their password).</li><li>Make sure you do NOT connect to the guest network.</li><li>Confirm the cameras show as online.</li></ol>' +
    '<h3>14.2 Night-Specific Troubleshooting</h3>' +
    '<table class="panic-table"><thead><tr><th>Issue</th><th>Solution</th></tr></thead><tbody>' +
    '<tr><td>Devices stay in RGB (color) mode during lights-off</td><td>Turn off more surrounding lights. If not possible, proceed \u2014 not controllable.</td></tr>' +
    '<tr><td>Some devices in IR, others in RGB during lights-off car scenarios</td><td>This is problematic (all should be same mode). Try minimizing ambient light. If not controllable, proceed with recording.</td></tr>' +
    '<tr><td>Floodlight/spotlight light turns off between scenarios</td><td>Likely using battery mode. Switch to wired power. Verify light is ON before each recording.</td></tr>' +
    '<tr><td>Floodlight/Spotlight devices enter battery preservation mode</td><td>Connect Floodlight/Spotlight devices to wired power source. Do not rely on battery.</td></tr>' +
    '<tr><td>Shadow on calibration board when Floodlight/Spotlight lights are on</td><td>Floodlight/Spotlight devices height is too low. Raise the lighting tripod so the device is higher than the upper cameras.</td></tr>' +
    '<tr><td>Motion-activated lights turning on during lights-off recordings</td><td>Turn off motion detection on floodlight/spotlight via Ring app for ALL devices. Ask participant to disable any motion-sensor exterior lights.</td></tr>' +
    '<tr><td>Feed switches from IR to RGB during Scenario 16 (car lights flashing)</td><td>Expected behavior \u2014 proceed with recording.</td></tr>' +
    '<tr><td>Uncontrollable light sources (streetlights, solar lights, neighbor lights)</td><td>If possible, set up away from them. If not, proceed \u2014 not controllable.</td></tr>' +
    '</tbody></table>' +
    '<h3>Section 15: Frequently Asked Questions</h3>' +
    '<table class="panic-table"><thead><tr><th>Question</th><th>Answer</th></tr></thead><tbody>' +
    '<tr><td>Does the floodlight always pair with a specific rig?</td><td>No. Pairing does not matter \u2014 variation is encouraged.</td></tr>' +
    '<tr><td>Do interior home lights reflecting onto the scene invalidate lights-off scenarios?</td><td>No. Leave as-is; these are not controllable.</td></tr>' +
    '<tr><td>Can moderators use flashlights during lights-off scenarios?</td><td>Yes, for safety. Hold the flashlight naturally near the feet.</td></tr>' +
    '<tr><td>What if there are uncontrollable light sources (motion-activated, solar, streetlights)?</td><td>If possible, set up elsewhere. If not possible, proceed \u2014 not controllable.</td></tr>' +
    '<tr><td>How dark does \u201Clights off\u201D have to be?</td><td>Begin after sunset (when there is no light coming from the sky). Ensure all controllable lights are off and IR mode is active.</td></tr>' +
    '<tr><td>Do we add the floodlight/spotlight devices to Lakitu?</td><td>No. Do not add them \u2014 risks accidental selection.</td></tr>' +
    '<tr><td>What if the Floodlight/Spotlight devices\u2019 lights turn off between scenarios?</td><td>It\u2019s on battery preservation mode. Switch to wired power.</td></tr>' +
    '</tbody></table>';

  var EMERGENCY_HTML =
    '<p class="panic-emg-intro">Escalation tiers</p>' +
    '<div class="panic-tier tier-ok"><div class="panic-tier-label">Handle it yourself</div><p>Routine session flow, everything the scripts cover, normal setup problems you can resolve.</p></div>' +
    '<div class="panic-tier tier-flag"><div class="panic-tier-label">Flag in real time</div><p>A neighbor confrontation, police arriving, an unworkable environment, a participant who appears intoxicated, inappropriate conduct toward you, a participant in visible distress.</p></div>' +
    '<div class="panic-tier tier-report"><div class="panic-tier-label">Report afterward</div><p>A canceled or cut-short session, a withdrawal request, any complaint from a participant or a neighbor, equipment damage. <strong>Same night.</strong></p></div>' +
    '<div class="panic-tier tier-escalate"><div class="panic-tier-label">Escalate immediately</div><p>Police contact of any kind, a lost or corrupted capture, a demand touching the consent form you cannot answer, an allegation of misconduct, harm or threat of harm. <strong>Notify Ritu and Sander directly.</strong></p></div>';

  function openMenu() { fab.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); menu.setAttribute('aria-hidden', 'false'); }
  function closeMenu() { fab.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true'); }
  function openModal(title, html) {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    modalBody.scrollTop = 0;
  }
  function closeModal() { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); }

  btn.addEventListener('click', function (e) { e.stopPropagation(); fab.classList.contains('open') ? closeMenu() : openMenu(); });
  menu.addEventListener('click', function (e) {
    var opt = e.target.closest ? e.target.closest('.panic-opt') : null;
    if (!opt) return;
    var kind = opt.getAttribute('data-panic');
    closeMenu();
    if (kind === 'comm') { window.open(TEAMS_URL, '_blank', 'noopener'); }
    else if (kind === 'troubleshooting') { openModal('Troubleshooting Tips', TROUBLESHOOTING_HTML); }
    else if (kind === 'emergency') { openModal('Emergency \u2014 Escalation Tiers', EMERGENCY_HTML); }
  });
  document.addEventListener('click', function (e) { if (fab.classList.contains('open') && !fab.contains(e.target)) closeMenu(); });
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMenu(); closeModal(); } });
})();
