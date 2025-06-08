// formAnalyzer.js (modified)

/**
 * Analyzes the given form elements and returns a semantic mapping.
 * This is a mock implementation. A real LLM would perform complex analysis.
 *
 * @param {Array<Object>} formElements - An array of objects, where each object
 *                                     represents a form field and contains
 *                                     properties like id, name, type, label text.
 * @returns {Promise<Object>} A promise that resolves to an object mapping
 *                            field identifiers (e.g., id or name) to semantic types
 *                            (e.g., 'FIRST_NAME', 'EMAIL', 'SUBMIT_BUTTON').
 */
async function analyzeFormWithNanoLLM(formElements) {
  console.log("NanoLLM (mock): Analyzing form elements:", formElements);

  return new Promise(resolve => {
    setTimeout(() => {
      const analysis = {};
      formElements.forEach((element, index) => {
        const elId = element.id || '';
        const elName = element.name || '';
        const elType = element.type || '';
        const elLabel = element.label ? element.label.toLowerCase() : '';

        // Ensure a unique key if id and name are both missing or not unique
        const key = elId || elName || `field_${index}_${Math.random().toString(36).substr(2, 5)}`;

        if (elLabel.includes('first name') || elName.includes('fname') || elId.includes('fname')) {
          analysis[key] = 'FIRST_NAME';
        } else if (elLabel.includes('last name') || elName.includes('lname') || elId.includes('lname')) {
          analysis[key] = 'LAST_NAME';
        } else if (elLabel.includes('email') || elType === 'email') {
          analysis[key] = 'EMAIL';
        } else if (elLabel.includes('address') || elName.includes('address')) {
          analysis[key] = 'ADDRESS_STREET';
        } else if (elType === 'submit' || elLabel.includes('submit') || elLabel.includes('register') || elLabel.includes('sign up')) {
          analysis[key] = 'SUBMIT_BUTTON';
        } else {
          analysis[key] = 'UNKNOWN';
        }
      });
      console.log("NanoLLM (mock): Analysis complete:", analysis);
      resolve(analysis);
    }, 500); // Simulate network delay or processing time
  });
}

// Example of how form elements could be collected (to be called from content.js)
function collectFormFieldsForAnalysis(formElement) {
    const fields = [];
    // Query all relevant input types, textareas, selects, buttons
    formElement.querySelectorAll('input, textarea, select, button').forEach(el => {
        let labelText = '';
        // Try to find an associated label
        if (el.id) {
            const label = document.querySelector(`label[for="${el.id}"]`);
            if (label) {
                labelText = label.textContent.trim();
            }
        }
        // If no label, try to get parent label text if element is wrapped by a label
        if (!labelText && el.parentElement.tagName === 'LABEL') {
            labelText = el.parentElement.textContent.trim();
        }
        // Fallback for aria-label or placeholder
        if (!labelText) {
            labelText = el.getAttribute('aria-label') || el.getAttribute('placeholder') || '';
        }

        fields.push({
            id: el.id,
            name: el.name,
            type: el.type,
            tag: el.tagName.toLowerCase(),
            label: labelText,
            // Potentially add more attributes: e.g., el.autocomplete, el.placeholder
        });
    });
    return fields;
}

/**
 * Orchestrates form analysis: tries to fetch from DB, falls back to LLM, submits new analysis.
 * @param {HTMLFormElement} formElement - The HTML form element.
 * @param {string} pageUrl - The current page URL.
 * @returns {Promise<Object>} A promise that resolves to the field mapping object.
 */
async function orchestrateFormAnalysis(formElement, pageUrl) {
    const formId = generateFormId(formElement, pageUrl); // from centralizedDbApi.js
    console.log(`Orchestrating analysis for formId: ${formId}`);

    try {
        const existingDescription = await getFormDescription(formId, pageUrl); // from centralizedDbApi.js
        if (existingDescription && existingDescription.fieldMappings) {
            console.log("Found existing form description in DB (mock):", existingDescription.fieldMappings);
            // Optionally, update usage count or other metadata here via another DB API call
            return existingDescription.fieldMappings;
        }
    } catch (error) {
        console.warn("Error fetching form description from DB (mock):", error);
    }

    console.log("No existing description found or error, proceeding with LLM analysis (mock).");
    const fieldsToAnalyze = collectFormFieldsForAnalysis(formElement); // from this file
    const llmAnalysisResult = await analyzeFormWithNanoLLM(fieldsToAnalyze); // from this file

    if (llmAnalysisResult && Object.keys(llmAnalysisResult).length > 0) {
        const newFormDescription = {
            formId: formId,
            siteUrl: pageUrl,
            firstSeen: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            fieldMappings: llmAnalysisResult,
            usageCount: 1,
            version: "0.1-mock-llm" // Version of your LLM/analysis logic
        };
        try {
            await submitFormDescription(newFormDescription); // from centralizedDbApi.js
            console.log("New form description submitted to DB (mock).");
        } catch (error) {
            console.warn("Error submitting new form description to DB (mock):", error);
        }
    }
    return llmAnalysisResult;
}
