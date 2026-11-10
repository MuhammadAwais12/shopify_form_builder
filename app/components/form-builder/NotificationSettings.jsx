import { useState } from "react";

// Per-form email notifications. Turning the switch off clears the address, so
// a hidden address can never keep receiving submissions.
export default function NotificationSettings({ notificationEmail, onChange }) {
  const email = notificationEmail ?? "";
  const [enabled, setEnabled] = useState(email !== "");

  function toggle(next) {
    setEnabled(next);
    if (!next) onChange("notificationEmail", "");
  }

  return (
    <s-section heading="Email notifications">
      <s-stack gap="base">
        <s-switch
          label="Email me when this form is submitted"
          details="Each response is sent to the address below, with every field and answer."
          checked={enabled}
          onChange={(event) => toggle(event.currentTarget.checked)}
        />

        {enabled && (
          <s-email-field
            label="Send notifications to"
            value={email}
            details="Only this form uses this address. Other forms can use a different one."
            onChange={(event) =>
              onChange("notificationEmail", event.currentTarget.value)
            }
          />
        )}

        {enabled && email.trim() === "" && (
          <s-banner tone="warning">
            Enter an email address, otherwise no notifications will be sent.
          </s-banner>
        )}
      </s-stack>
    </s-section>
  );
}
