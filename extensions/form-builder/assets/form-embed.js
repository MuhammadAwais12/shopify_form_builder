// Renders a Form Builder form on the storefront.
// Contract with the app (via the app proxy, endpoint = data-endpoint):
//   GET  {endpoint}/form?slug=<handle>  -> { name, submitButtonText, successMessage, fields: [...] }  (404 if missing/unpublished)
//   POST {endpoint}/submit  { slug, values: { [fieldId]: value }, website: "" }
//        -> { ok: true } | { ok: false, error?: string, errors?: { [fieldId]: string } }
// All text is inserted with textContent, never innerHTML.
(() => {
  "use strict";

  let counter = 0;
  const uid = (prefix) => `${prefix}-${++counter}`;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === "text") node.textContent = value;
      else node.setAttribute(key, value === true ? "" : String(value));
    }
    for (const child of children) if (child) node.append(child);
    return node;
  }

  const INPUT_TYPES = { text: "text", email: "email", number: "number", phone: "tel", date: "date" };

  // Returns { node, read(), setError(message), focus() } for one field.
  function buildField(field) {
    const id = uid("fb-field");
    const errorId = `${id}-error`;
    const error = el("p", { class: "fb-error", id: errorId, role: "alert" });
    const wrapper = el("div", { class: "fb-field" });
    const labelText = (hasStar) => {
      const label = el("span", { text: field.label });
      if (hasStar && field.required) label.append(el("span", { class: "fb-required", "aria-hidden": "true", text: "*" }));
      return label;
    };

    let control; // element that receives focus / aria attributes
    let read;

    if (field.fieldType === "radio") {
      const group = el("fieldset", { class: "fb-field" });
      group.append(el("legend", { class: "fb-label" }, labelText(true)));
      const list = el("div", { class: "fb-options" });
      const name = uid("fb-radio");
      const inputs = (field.options || []).map((option) => {
        const input = el("input", { type: "radio", name, value: option });
        list.append(el("label", { class: "fb-option" }, input, el("span", { text: option })));
        return input;
      });
      group.append(list, error);
      group.setAttribute("aria-describedby", errorId);
      control = inputs[0] || group;
      read = () => (inputs.find((i) => i.checked) || {}).value || "";
      return finish(group, group, control, read);
    }

    if (field.fieldType === "checkbox") {
      const input = el("input", { type: "checkbox", id });
      wrapper.append(el("label", { class: "fb-option", for: id }, input, labelText(true)), error);
      return finish(wrapper, wrapper, input, () => input.checked);
    }

    let input;
    if (field.fieldType === "textarea") {
      input = el("textarea", { class: "fb-input", id, rows: 4, placeholder: field.placeholder });
    } else if (field.fieldType === "select") {
      input = el("select", { class: "fb-input", id }, el("option", { value: "", text: "Select an option" }));
      for (const option of field.options || []) input.append(el("option", { value: option, text: option }));
    } else {
      input = el("input", {
        class: "fb-input",
        id,
        type: INPUT_TYPES[field.fieldType] || "text",
        placeholder: field.placeholder,
        inputmode: field.fieldType === "number" ? "decimal" : undefined,
      });
    }
    wrapper.append(el("label", { class: "fb-label", for: id }, labelText(true)), input, error);
    return finish(wrapper, wrapper, input, () => input.value.trim());

    function finish(node, flagTarget, focusTarget, readValue) {
      focusTarget.setAttribute("aria-describedby", errorId);
      return {
        node,
        read: readValue,
        focus: () => focusTarget.focus(),
        setError(message) {
          error.textContent = message || "";
          if (message) flagTarget.setAttribute("data-invalid", "");
          else flagTarget.removeAttribute("data-invalid");
          focusTarget.setAttribute("aria-invalid", message ? "true" : "false");
        },
      };
    }
  }

  function validate(field, value) {
    const empty = value === "" || value === false || value === null;
    if (field.required && empty) return field.fieldType === "checkbox" ? "This box must be checked." : "This field is required.";
    if (!empty && field.fieldType === "email" && !EMAIL.test(value)) return "Enter a valid email address.";
    if (!empty && field.fieldType === "number" && Number.isNaN(Number(value))) return "Enter a valid number.";
    return "";
  }

  async function loadForm(endpoint, slug) {
    const res = await fetch(`${endpoint}/form?slug=${encodeURIComponent(slug)}`, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return res.json();
  }

  function render(container, definition, endpoint, slug) {
    const fields = definition.fields.map((field) => ({ field, ui: buildField(field) }));
    const status = el("p", { class: "fb-error", role: "alert" });
    const button = el("button", { class: "fb-button", type: "submit", text: definition.submitButtonText });
    const honeypot = el("input", { type: "text", name: "website", tabindex: "-1", autocomplete: "off" });
    const hp = el("div", { class: "fb-hp", "aria-hidden": "true" }, honeypot);
    const form = el("form", { novalidate: true });
    for (const { ui } of fields) form.append(ui.node);
    form.append(hp, status, button);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.textContent = "";
      let firstInvalid = null;
      const values = {};
      for (const { field, ui } of fields) {
        const value = ui.read();
        const message = validate(field, value);
        ui.setError(message);
        if (message && !firstInvalid) firstInvalid = ui;
        values[field.id] = value;
      }
      if (firstInvalid) return firstInvalid.focus();

      button.disabled = true;
      try {
        const res = await fetch(`${endpoint}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ slug, values, website: honeypot.value }),
        });
        let payload = null;
        try { payload = await res.json(); } catch { /* non-JSON response */ }

        if (res.ok && payload && payload.ok) {
          container.replaceChildren(el("p", { class: "fb-success", role: "status", text: definition.successMessage }));
          return;
        }
        if (payload && payload.errors) {
          let first = null;
          for (const { field, ui } of fields) {
            const message = payload.errors[field.id] || "";
            ui.setError(message);
            if (message && !first) first = ui;
          }
          if (first) first.focus();
        }
        status.textContent = (payload && payload.error) || "Something went wrong. Please try again.";
      } catch {
        status.textContent = "Network error. Please check your connection and try again.";
      } finally {
        button.disabled = false;
      }
    });

    container.replaceChildren(form);
  }

  async function init(container) {
    if (container.hasAttribute("data-fb-ready")) return;
    const slug = container.dataset.slug;
    if (!slug) return;
    container.setAttribute("data-fb-ready", "");
    const endpoint = container.dataset.endpoint || "/apps/forms/api";
    const designMode = Boolean(window.Shopify && window.Shopify.designMode);
    try {
      const definition = await loadForm(endpoint, slug);
      if (!definition) {
        container.replaceChildren(designMode ? el("p", { class: "fb-notice", text: `No published form found with handle "${slug}".` }) : "");
        return;
      }
      render(container, definition, endpoint, slug);
    } catch {
      container.replaceChildren(designMode ? el("p", { class: "fb-notice", text: "Could not load the form." }) : "");
    }
  }

  const initAll = () => document.querySelectorAll("[data-fb-form]").forEach(init);
  initAll();
  // Theme editor: re-run when sections are added or re-rendered.
  document.addEventListener("shopify:section:load", initAll);
})();
