/**
 * DJ Loop Notifier
 *
 * Sends approval requests and status updates via SMS (Twilio) and Slack.
 * DJ approves/rejects from his phone while doing other things.
 */

export interface ApprovalRequest {
  ideaId: string;
  sourceUrl: string;
  concept: string;
  projectDna: string;
  estimatedHours: number;
  estimatedCost: number;
  commentFinds: {
    repos: string[];
    suggestions: string[];
  };
}

export interface BuildComplete {
  ideaId: string;
  projectName: string;
  repoUrl: string;
  deployedUrl: string;
  buildTime: string;
  actualCost: number;
  notes: string[];
}

// Twilio SMS
export async function sendSMS(to: string, message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("Twilio not configured, skipping SMS");
    return;
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: message,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Twilio error: ${response.statusText}`);
  }
}

// Slack webhook
export async function sendSlack(
  webhookUrl: string,
  blocks: any[]
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });

  if (!response.ok) {
    throw new Error(`Slack error: ${response.statusText}`);
  }
}

/**
 * Send approval request to DJ
 */
export async function requestApproval(
  request: ApprovalRequest,
  settings: {
    smsNumber?: string;
    slackWebhook?: string;
  }
): Promise<void> {
  const { ideaId, concept, projectDna, estimatedHours, estimatedCost, commentFinds } = request;

  // SMS version (concise)
  if (settings.smsNumber) {
    const smsMessage = `🎯 NEW IDEA

${concept}

Type: ${projectDna}
Est: ${estimatedHours}hrs / $${estimatedCost}
${commentFinds.repos.length > 0 ? `Repos found: ${commentFinds.repos.length}` : ""}

Reply:
YES - approve
NO - kill
HOLD - save for later`;

    await sendSMS(settings.smsNumber, smsMessage);
  }

  // Slack version (rich)
  if (settings.slackWebhook) {
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🎯 New Idea Ready for Review",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${concept}*`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Type:* ${projectDna}`,
          },
          {
            type: "mrkdwn",
            text: `*Est:* ${estimatedHours}hrs / $${estimatedCost}`,
          },
        ],
      },
    ];

    if (commentFinds.repos.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Repos found:*\n${commentFinds.repos.slice(0, 3).join("\n")}`,
        },
      });
    }

    if (commentFinds.suggestions.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Best suggestions:*\n${commentFinds.suggestions.slice(0, 2).join("\n")}`,
        },
      });
    }

    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "✓ Approve" },
          style: "primary",
          action_id: `approve_${ideaId}`,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "✕ Kill" },
          style: "danger",
          action_id: `kill_${ideaId}`,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Hold" },
          action_id: `hold_${ideaId}`,
        },
      ],
    } as any);

    await sendSlack(settings.slackWebhook, blocks);
  }
}

/**
 * Notify DJ that a build is complete
 */
export async function notifyBuildComplete(
  build: BuildComplete,
  settings: {
    smsNumber?: string;
    slackWebhook?: string;
  }
): Promise<void> {
  const { projectName, deployedUrl, repoUrl, buildTime, actualCost, notes } = build;

  // SMS version
  if (settings.smsNumber) {
    const smsMessage = `✅ BUILD COMPLETE

${projectName}

🔗 ${deployedUrl}
📁 ${repoUrl}

Time: ${buildTime}
Cost: $${actualCost.toFixed(2)}

${notes.length > 0 ? `Notes: ${notes[0]}` : ""}`;

    await sendSMS(settings.smsNumber, smsMessage);
  }

  // Slack version
  if (settings.slackWebhook) {
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "✅ Build Complete",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${projectName}*`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Live:* <${deployedUrl}|View Demo>`,
          },
          {
            type: "mrkdwn",
            text: `*Repo:* <${repoUrl}|View Code>`,
          },
          {
            type: "mrkdwn",
            text: `*Build time:* ${buildTime}`,
          },
          {
            type: "mrkdwn",
            text: `*Cost:* $${actualCost.toFixed(2)}`,
          },
        ],
      },
    ];

    if (notes.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Notes:*\n${notes.map((n) => `• ${n}`).join("\n")}`,
        },
      });
    }

    await sendSlack(settings.slackWebhook, blocks);
  }
}
