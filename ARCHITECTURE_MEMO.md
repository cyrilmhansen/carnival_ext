# Architecture Memo: Identity Management Chrome Extension

## 1. Envisioned Architecture

This project aims to create a mobile-first Chrome extension that assists users in managing their online identities (both real and pseudonymous) and automates the filling of web and mobile application sign-up forms. The system is designed around three core components: the Chrome Extension itself, an on-device Nano Language Model (LLM) for form understanding, and a Centralized Database for sharing and optimizing form descriptions.

### 1.1. Chrome Extension

The Chrome Extension is the primary user-facing component. Its responsibilities include:

*   **Identity Management UI**: Providing a user interface (popup) for creating, viewing, editing, and deleting various user identities. These identities can contain both real and fictitious data elements (name, email, address, etc.). Identities are stored using `chrome.storage.sync` for cross-device availability.
*   **Content Script (`content.js`)**: Injected into web pages, this script is responsible for:
    *   Detecting and analyzing form structures on the active page.
    *   Interacting with the on-device Nano LLM to understand the semantic meaning of form fields.
    *   Utilizing the Accessibility API (and other DOM analysis techniques) to accurately identify and interact with form elements.
    *   Populating form fields with data from the user's chosen identity.
    *   Communicating with the Centralized Database to fetch known form descriptions or submit new ones.
*   **Background Script (`background.js`)**: Manages extension state, context menu creation, and communication between different parts of the extension.
*   **User Controls**: Allowing users to select which identity to use for form filling and to trigger the form-filling process.

### 1.2. Nano Language Model (Nano LLM)

The Nano LLM is a small, efficient language model designed to run directly on the user's device (smartphone or desktop).

*   **Role**: Its primary function is to perform semantic analysis of web forms. Given the HTML structure and associated metadata (labels, placeholders, ARIA attributes) of a form, the LLM will identify the likely purpose of each field (e.g., "First Name", "Email Address", "Password", "Submit Button").
*   **Input**: A structured representation of the form elements (e.g., JSON containing field types, IDs, names, labels, surrounding text).
*   **Output**: A mapping of field identifiers to recognized semantic types (e.g., `{ "user_email_field": "EMAIL_ADDRESS", "fname_input": "FIRST_NAME" }`).
*   **On-Device Deployment**: This is crucial for privacy (sensitive form data is not sent to a remote server for analysis) and offline capability.

### 1.3. Centralized Database

The Centralized Database serves as a community-driven repository for form descriptions/fingerprints.

*   **Purpose**:
    *   To store anonymous descriptions of forms encountered and analyzed by users' Nano LLMs.
    *   To allow the extension to query for known form structures, potentially bypassing the need for local LLM analysis if a high-confidence description already exists.
    *   To optimize form-filling over time by learning common patterns and sharing successful analysis results across the user community.
*   **Data Schema (Conceptual)**: Each entry might include:
    *   `formId` (a unique identifier for the form, possibly a hash of its structure/URL).
    *   `siteUrl` (URL of the website).
    *   `fieldMappings` (the semantic analysis result from an LLM).
    *   `anonymizedUsageStats` (e.g., success rate, number of times used).
    *   `version` (version of the analysis logic).
*   **API Interactions**: The extension will communicate with this database via a secure API to:
    *   `GET /formDescription?formId=<id>&siteUrl=<url>`: Retrieve an existing description.
    *   `POST /formDescription`: Submit a new (anonymized) form description after local analysis.

## 2. Work Completed So Far (Initial Structure)

The project currently has a foundational structure with several key components implemented or mocked:

*   **Basic Extension Framework**:
    *   `manifest.json` configured with necessary permissions (storage, activeTab, scripting, contextMenus, accessibilityFeatures).
    *   `background.js` for context menu creation and basic event handling.
    *   `popup.html` and `popup.js` for identity management UI.
    *   `options.html` and `options.js` (placeholders).
    *   `content.js` for basic form interaction logic.
    *   Placeholder icon files.
*   **Identity Management**:
    *   Users can add, view, and delete identities (name, email, address) through the popup.
    *   Identities are stored using `chrome.storage.sync`, enabling automatic synchronization across devices.
*   **Basic Form Filling**:
    *   A context menu item ("Fill Form with Identity") triggers form filling.
    *   `content.js` currently uses basic heuristics (matching common field names/IDs like "email", "name") to populate fields with data from the first stored identity.
*   **Nano LLM Placeholder (`formAnalyzer.js`)**:
    *   A mock `analyzeFormWithNanoLLM` function simulates LLM analysis with a predefined delay and heuristic-based field type recognition.
    *   `collectFormFieldsForAnalysis` function extracts field information from a form.
    *   An `orchestrateFormAnalysis` function coordinates fetching from/submitting to the mock Centralized DB and calling the mock LLM.
*   **Centralized Database API Placeholder (`centralizedDbApi.js`)**:
    *   Mock API functions (`submitFormDescription`, `getFormDescription`) simulate interaction with a backend.
    *   Defines a `FormDescription` data structure.
    *   Includes a `generateFormId` helper.
*   **Testing Outline**:
    *   Documentation outlining unit test strategies for `popup.js` (identity management).
    *   A list of E2E test scenarios covering major functionalities.

## 3. Remaining Tasks for Full Functionality

Significant work remains to transition from the current placeholder-based structure to a fully functional and robust application:

*   **Nano LLM Development & Integration**:
    *   Research and select/develop a suitable Nano LLM architecture that can run efficiently on mobile devices.
    *   Train the LLM on diverse form structures to accurately identify field semantics.
    *   Package the model for on-device inference (e.g., using TensorFlow Lite, ONNX Runtime Mobile).
    *   Replace the mock `analyzeFormWithNanoLLM` in `formAnalyzer.js` with actual calls to the local LLM.
*   **Centralized Database Implementation**:
    *   Design and develop the backend infrastructure (server, database).
    *   Implement the secure API endpoints defined in `centralizedDbApi.js`.
    *   Address data privacy, anonymization, and security for stored form descriptions.
    *   Consider mechanisms for community validation or moderation of form descriptions if needed.
*   **Robust Form Field Detection (Accessibility API)**:
    *   Enhance `content.js` to deeply utilize the `chrome.accessibilityFeatures` API (and other advanced DOM analysis techniques) for reliable identification of form fields, their labels, and roles, especially for complex or non-standard forms. This will replace the current basic heuristics.
*   **Advanced Identity Features**:
    *   Implement UI for selecting which identity to use if multiple are stored.
    *   Allow for more detailed identity profiles (e.g., phone numbers, usernames, custom fields).
    *   Secure handling of sensitive data within identities (e.g., password fields – though auto-filling passwords has significant security implications to consider carefully).
*   **UI/UX Refinements**:
    *   Improve the visual design and user experience of the `popup.html` and `options.html` pages.
    *   Provide clear feedback to the user during form analysis and filling.
*   **Security Hardening**:
    *   Thoroughly review all extension permissions.
    *   Analyze and mitigate potential security vulnerabilities (e.g., XSS if data is mishandled, insecure communication with the central database).
    *   Ensure user data is handled with utmost care, especially if any part of it ever leaves the device.
*   **Comprehensive Testing**:
    *   Implement the outlined unit tests (e.g., using Jest or a similar framework).
    *   Develop and automate E2E tests (e.g., using Puppeteer or Selenium).
    *   Test across a wide variety of websites and form structures.
*   **Performance Optimization**:
    *   Ensure the content script and LLM analysis do not negatively impact browser performance.
*   **Deployment and Packaging**:
    *   Prepare the extension for submission to the Chrome Web Store, including all necessary assets and documentation.
    *   Address any feedback from the store review process.
