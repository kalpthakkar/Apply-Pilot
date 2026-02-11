# VENV for Powershell: .\venv_queryllm\Scripts\Activate.ps1
# VENV of CMD: .\venv_queryllm\Scripts\activate.bat

# ======== COLORS =========
colors = {
  "color": "#009688",  # /* (Soft Teal) A refreshing, professional teal */
  "color": "#607d8b",  # /* (Cool Gray) A sleek, modern gray with a cool tone */
  "color": "#673ab7",  # /* (Deep Purple) Bold and elegant, perfect for a professional touch */
  "color": "#ff6f61",  # /* (Vibrant Coral) A warm, contrasting color that adds energy */
  "color": "#388e3c",  # /* (Rich Emerald Green) A sophisticated, calming green */
  "color": "#00bcd4",  # /* (Bright Cyan) A vibrant, modern cyan with a techy vibe */
  "color": "#fbc02d",  # /* (Warm Gold) Elegant, high-end gold, good for accents */
  "color": "#9c27b0",  # /* (Muted Lavender) A soft, calming purple for a professional yet friendly look */
  "color": "#ffb74d",  # /* (Soft Peach) A warm, welcoming peach for a more approachable design */
  "color": "#3f51b5",  # /* (Slate Blue) A modern, muted blue with a more professional tone */
  "color": "#424242",  # /* (Warm Charcoal) A dark, neutral charcoal for a sleek, contemporary feel */
  "color": "#cddc39",  # /* (Electric Lime) A bright, energetic yellow-green for highlights */
  "color": "#ff5722",  # /* (Sunset Orange) A warm, bold orange with a professional pop */
}


# ====================== LLM RESPONSE : Email Generation Task ======================
"""
In both referral and non referral case, the end goal is to get into hiring loop. The only difference in referral mode is we're asking referral for a specific role/position, however in other case we could be pitching for role or shadow job (which may or may not exists) to hiring decision makers like recruiters, hiring managers, CEO, founders, team lead, etc.

{{ $('Loop Over • Generate and Send Email').item.json["Campaign ID"] }}
"""

# ====================== Script with HTML Element Creation ======================

script_copy_emails = """
async function extractCardInfoWithEmailClick(topN) {
  const cards = document.querySelectorAll('div.flex.p-4.border-b.border-gray-200');
  const result = {};

  for (let i = 0; i < Math.min(topN, cards.length); i++) {
    const card = cards[i];

    const nameEl = card.querySelector('.text-base');
    const name = nameEl ? nameEl.innerText.trim() : `Unknown_${i}`;

    const viewEmailBtn = Array.from(card.querySelectorAll('button'))
      .find(btn => btn.textContent.includes('View email'));

    if (viewEmailBtn) {
      viewEmailBtn.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const emailEls = card.querySelectorAll('[data-testid="contact-infotext-wrapper"]');
    const emails = Array.from(emailEls).map(el => el.innerText.trim());

    const linkedinEl = card.querySelector('[href^="https://linkedin.com/in/"]');
    const linkedin = linkedinEl?.href || null;

    result[name] = {
      email: emails,
      linkedin: linkedin
    };
  }

  // Store globally
  window._scrapedCardData = JSON.stringify(result, null, 2);

  // Create copy button
  const copyBtn = document.createElement('button');
  copyBtn.textContent = '📋 Auto Copy Button';
  copyBtn.className = 'auto-copy-button'; // <--- Unique class
  copyBtn.style = 'position:fixed;top:20px;right:20px;padding:10px 15px;background:#4CAF50;color:white;border:none;border-radius:5px;z-index:9999;cursor:pointer;font-size:14px;';

  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(window._scrapedCardData);
      alert('✅ Data copied to clipboard!');
      copyBtn.remove();
    } catch (err) {
      alert('❌ Clipboard copy failed: ' + err.message);
      console.error(err);
    }
  };

  document.body.appendChild(copyBtn);

  // Try clicking after a short delay
  setTimeout(() => {
    const btn = document.querySelector('.auto-copy-button');
    if (btn) btn.click(); // Programmatic click
  }, 2000); // Adjust delay as needed
}

// Run it
extractCardInfoWithEmailClick(${topN});
"""
