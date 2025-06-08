// Content script (content.js) - modified
console.log("Content script loaded and running.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fill_form_from_context_menu") {
    console.log("Received fill_form_from_context_menu action with data:", request.data);
    let targetForm = document.activeElement ? document.activeElement.closest('form') : null;
    if (!targetForm) {
        targetForm = document.querySelector('form');
    }

    if (targetForm) {
        // Use the new orchestrator function
        orchestrateFormAnalysis(targetForm, window.location.href) // from formAnalyzer.js
            .then(analysisResult => {
                console.log("Form analysis orchestration complete, result:", analysisResult);
                fillFormFields(request.data, analysisResult, targetForm);
                sendResponse({ status: "success", message: "Form fields processed using orchestrated analysis." });
            })
            .catch(error => {
                console.error("Form analysis orchestration failed:", error);
                // Fallback to basic filling if analysis fails
                fillFormFields(request.data, null, targetForm);
                sendResponse({ status: "error", message: "Form analysis orchestration failed, used fallback." });
            });
    } else {
        console.warn("No form found on the page to fill.");
        fillFormFields(request.data, null, document);
        sendResponse({ status: "warning", message: "No form found, attempting global fill." });
    }
    return true; // Indicates that the response is sent asynchronously
  }
});

// Modified fillFormFields to use analysis results
function fillFormFields(identity, analysis, scopeElement) {
  if (!identity) {
    console.warn("No identity data provided to fillFormFields.");
    return;
  }
  console.log("Attempting to fill form with identity:", identity, "using analysis:", analysis, "scoped to:", scopeElement.tagName);

  const scope = scopeElement || document; // Search within the given form or whole document

  if (analysis && Object.keys(analysis).length > 0) {
    for (const fieldKey in analysis) { // fieldKey is the id, name, or generated unique key
      const semanticType = analysis[fieldKey];
      let valueToFill = null;

      switch (semanticType) {
        case 'FIRST_NAME':
          valueToFill = identity.name ? identity.name.split(' ')[0] : null;
          break;
        case 'LAST_NAME':
          valueToFill = identity.name ? identity.name.split(' ').slice(1).join(' ') : null;
          break;
        case 'FULL_NAME':
          valueToFill = identity.name;
          break;
        case 'EMAIL':
          valueToFill = identity.email;
          break;
        case 'ADDRESS_STREET':
          valueToFill = identity.address;
          break;
      }

      if (valueToFill !== null) {
        let field = scope.querySelector(`#${CSS.escape(fieldKey)}`);
        if (!field) {
            // If the key was a name or a generated key, querySelectorAll might be more appropriate if names aren't unique.
            // However, formAnalyzer.js tries to use ID first, then name.
            // If it was a name, and names can be non-unique, this will take the first.
            const namedFields = scope.querySelectorAll(`[name="${CSS.escape(fieldKey)}"]`);
            if (namedFields.length > 0) field = namedFields[0];
        }
        // If the key was a generated one (e.g. field_0_abc12), it won't be found by id or name.
        // The current llmAnalysisResult key is based on id or name. If those are missing,
        // the key in `analysis` object won't directly map to a discoverable element attribute without
        // more complex logic (e.g. re-querying and matching by index/structure, which is brittle).
        // For this iteration, we assume if a key is in `analysis`, it's an ID or NAME that's findable.

        if (field && isElementVisible(field) && (field.value === '' || field.value === undefined)) {
          console.log(`Filling field (key: ${fieldKey}, type: ${semanticType}) with value: ${valueToFill}`);
          field.value = valueToFill;
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  } else {
    console.warn("No analysis provided or analysis is empty, falling back to basic heuristic field filling.");
    if (identity.name) {
      const nameSelectors = ["input[name*='name'][type='text']", "input[id*='name'][type='text']", "input[autocomplete*='name']"];
      fillField(nameSelectors, identity.name, scope);
    }
    if (identity.email) {
      const emailSelectors = ["input[type='email']", "input[name*='email'][type='text']", "input[id*='email'][type='text']", "input[autocomplete*='email']"];
      fillField(emailSelectors, identity.email, scope);
    }
    if (identity.address) {
      const addressSelectors = ["textarea[name*='address']", "textarea[id*='address']", "textarea[autocomplete*='address']"];
      fillField(addressSelectors, identity.address, scope);
    }
  }
}

function fillField(selectors, value, scope) {
  let fieldFilled = false;
  for (const selector of selectors) {
    const fields = scope.querySelectorAll(selector);
    fields.forEach(field => {
      if (isElementVisible(field) && (field.value === '' || field.value === undefined)) {
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        console.log("Fallback Filled field:", field, "with value:", value);
        fieldFilled = true;
      }
    });
    if (fieldFilled) break;
  }
}

function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) < 0.1) {
        return false;
    }
    if (el.offsetWidth === 0 && el.offsetHeight === 0 && el.getClientRects().length === 0) {
        return false;
    }
    return true;
}

console.log("Content script ready to use orchestrated form analysis.");
