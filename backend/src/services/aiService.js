const OpenAI = require("openai");
const config = require("../config");
const suitecrmService = require("./suitecrmService");
const mysqlService = require("./mysqlService");

const CRM_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_module_insights",
      description:
        "Get aggregated insights from a CRM module grouped by a field. Use for questions like 'leads by status', 'opportunities by stage', 'contacts by lead source', breakdowns, distributions, counts.",
      parameters: {
        type: "object",
        properties: {
          module: {
            type: "string",
            enum: ["Leads", "Contacts", "Accounts", "Opportunities", "Cases"],
            description: "The CRM module to analyze",
          },
          group_by: {
            type: "string",
            description:
              "The field to group by. Common fields: Leads(status, lead_source, industry), Opportunities(sales_stage, lead_source), Contacts(lead_source, account_name), Cases(status, priority, type), Accounts(industry, account_type)",
          },
        },
        required: ["module", "group_by"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_opportunity_pipeline",
      description:
        "Get the full sales pipeline with value and count per stage. Use for pipeline analysis, revenue forecasting, deal flow questions.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "search_crm_records",
      description:
        "Search for specific CRM records by a field value. Use when the user asks to find, show, or list specific records matching criteria.",
      parameters: {
        type: "object",
        properties: {
          module: {
            type: "string",
            enum: ["Leads", "Contacts", "Accounts", "Opportunities", "Cases"],
          },
          query: {
            type: "string",
            description: "The search term to match against the field",
          },
          field: {
            type: "string",
            description:
              "The field to search in (e.g. name, last_name, status, industry, email1, company, sales_stage)",
          },
          limit: {
            type: "number",
            description: "Max records to return (default 20)",
          },
        },
        required: ["module", "query", "field"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_dashboard_stats",
      description:
        "Get high-level CRM statistics: total counts per module and open pipeline value. Use for overview or summary questions.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_module_data",
      description:
        "Fetch ALL records from a CRM module and return full dataset for deep analysis. Use when the user asks to analyze all leads, all contacts, all opportunities etc. or asks for comprehensive insights, trends, patterns, or full data review. This returns every record with key fields.",
      parameters: {
        type: "object",
        properties: {
          module: {
            type: "string",
            enum: ["Leads", "Contacts", "Accounts", "Opportunities", "Cases"],
            description: "The CRM module to fetch all records from",
          },
        },
        required: ["module"],
      },
    },
  },
];

class AIService {
  constructor() {
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    this.model = config.openai.model;
  }

  async chat(userMessage, conversationHistory = [], context = null) {
    // Fetch active training data
    let trainingBlock = "";
    try {
      const trainingData = await mysqlService.getActiveTrainingData();
      if (trainingData.length > 0) {
        const grouped = {};
        for (const td of trainingData) {
          if (!grouped[td.category]) grouped[td.category] = [];
          grouped[td.category].push(td);
        }
        const sections = [];
        if (grouped.instruction) {
          sections.push(
            "## Custom Instructions\n" +
              grouped.instruction.map((t) => `- ${t.content}`).join("\n"),
          );
        }
        if (grouped.knowledge) {
          sections.push(
            "## Domain Knowledge\n" +
              grouped.knowledge
                .map((t) => `**${t.title}:** ${t.content}`)
                .join("\n"),
          );
        }
        if (grouped.correction) {
          sections.push(
            "## Corrections & Preferences\n" +
              grouped.correction.map((t) => `- ${t.content}`).join("\n"),
          );
        }
        if (grouped.example) {
          sections.push(
            "## Examples\n" +
              grouped.example
                .map((t) => `**${t.title}:**\n${t.content}`)
                .join("\n\n"),
          );
        }
        trainingBlock =
          "\n\n--- TRAINED KNOWLEDGE ---\n" +
          sections.join("\n\n") +
          "\n--- END TRAINED KNOWLEDGE ---\n";
      }
    } catch (err) {
      console.error("Failed to load training data:", err.message);
    }

    const systemPrompt = `You are an AI analytics assistant for SuiteCRM. You help users analyze CRM data, understand customer relationships, sales pipelines, and business metrics.

You have tools to query live CRM data. ALWAYS use tools to get data before answering — do not guess.

Guidelines:
- Use analyze_module_data to fetch ALL records from a module for deep analysis (e.g. "analyze all leads", "review all opportunities", "give me insights on contacts")
- Use get_module_insights for breakdowns, distributions, and counts (e.g. "leads by status")
- Use get_opportunity_pipeline for pipeline and revenue analysis
- Use search_crm_records for finding specific records (e.g. "leads from web")
- Use get_dashboard_stats for high-level overviews
- You can call multiple tools to build a complete answer
- When the user asks to show N records, return EXACTLY that many
- Format each record as a clean labeled list, NOT a table. Example format:
  **Lead Name:** Ms. Miranda Moore
  **Assigned User:** Jenieray Montinola
  **Status:** New
  **Email:** miranda@example.com
  (use a horizontal rule --- between records)
- Include salutation (Mr., Ms., Dr., etc.) with names when available
- Always include the Assigned User for each record
- Provide actionable business insights, not just raw data
- Suggest follow-up analyses when relevant${trainingBlock}`;

    const messages = [{ role: "system", content: systemPrompt }];

    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach((msg) => {
      messages.push({ role: msg.role, content: msg.content });
    });
    messages.push({ role: "user", content: userMessage });

    let sources = [];
    const maxIterations = 5;

    for (let i = 0; i < maxIterations; i++) {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        tools: CRM_TOOLS,
        temperature: 0.7,
        max_tokens: 4096,
      });

      const choice = completion.choices[0];

      if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
        messages.push(choice.message);

        for (const toolCall of choice.message.tool_calls) {
          const result = await this.executeTool(toolCall);
          if (result.sources) sources.push(...result.sources);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result.data),
          });
        }
        continue;
      }

      // Final response
      const reply = choice.message.content;
      const analyticsData = this.extractAnalyticsHints(userMessage, reply);

      return { reply, sources, analyticsData };
    }

    return {
      reply:
        "I ran into complexity analyzing that. Could you rephrase your question?",
      sources,
      analyticsData: null,
    };
  }

  async executeTool(toolCall) {
    const name = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);
    let data = {};
    let sources = [];

    try {
      switch (name) {
        case "get_module_insights":
          data = await suitecrmService.getModuleInsights(
            args.module,
            args.group_by,
          );
          sources = [`${args.module} grouped by ${args.group_by}`];
          break;

        case "get_opportunity_pipeline":
          data = await suitecrmService.getOpportunityPipeline();
          sources = ["Opportunity Pipeline"];
          break;

        case "search_crm_records":
          data = await suitecrmService.searchRecords(
            args.module,
            args.query,
            args.field,
            args.limit || 20,
          );
          sources = [`${args.module} search: ${args.query}`];
          break;

        case "get_dashboard_stats":
          data = await suitecrmService.getDashboardStats();
          sources = ["Dashboard Overview"];
          break;

        case "analyze_module_data":
          data = await suitecrmService.getFullModuleData(args.module);
          sources = [
            `Full ${args.module} Analysis (${data.total_records} records)`,
          ];
          break;

        default:
          data = { error: `Unknown tool: ${name}` };
      }
    } catch (error) {
      console.error(`Tool ${name} error:`, error.message);
      data = { error: error.message };
    }

    console.log(
      `Tool: ${name}(${JSON.stringify(args)}) → ${JSON.stringify(data).length} bytes`,
    );
    return { data, sources };
  }

  extractAnalyticsHints(query, reply) {
    const lowerQuery = query.toLowerCase();
    const hints = { chartType: null, module: null };

    // Detect requested chart types
    if (
      lowerQuery.includes("chart") ||
      lowerQuery.includes("graph") ||
      lowerQuery.includes("visual")
    ) {
      hints.chartType = "bar";
    }
    if (lowerQuery.includes("trend") || lowerQuery.includes("over time")) {
      hints.chartType = "line";
    }
    if (
      lowerQuery.includes("distribution") ||
      lowerQuery.includes("breakdown")
    ) {
      hints.chartType = "pie";
    }

    // Detect modules
    const modules = ["contacts", "accounts", "leads", "opportunities", "cases"];
    for (const mod of modules) {
      if (lowerQuery.includes(mod)) {
        hints.module = mod.charAt(0).toUpperCase() + mod.slice(1);
        break;
      }
    }

    return hints.chartType || hints.module ? hints : null;
  }

  extractRequestedCount(message) {
    const lower = message.toLowerCase();
    // Match patterns like "show me 20 leads", "list 50 contacts", "give me 10 accounts"
    const match = lower.match(
      /(?:show|list|give|get|display|fetch|find|return)\s+(?:me\s+)?(?:the\s+)?(?:top\s+)?(\d+)/,
    );
    if (match) return parseInt(match[1], 10);

    // Match patterns like "20 leads", "50 contacts" at start
    const match2 = lower.match(
      /^(\d+)\s+(?:leads|contacts|accounts|opportunities|cases|records)/,
    );
    if (match2) return parseInt(match2[1], 10);

    return 20; // default
  }

  async generateRagQuery(userMessage, conversationHistory = []) {
    try {
      const recentHistory = conversationHistory.slice(-4);
      const historyContext = recentHistory
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `You are a search query optimizer for a CRM database containing Contacts, Accounts, Leads, Opportunities, and Cases.

Given a user's question and recent conversation history, generate 1-3 concise search queries optimized for semantic similarity search against CRM records.

Each CRM record contains fields like: name, email, phone, company, industry, status, amount, sales_stage, lead_source, description, etc.

Rules:
- Output ONLY the search queries, one per line
- Use keywords and phrases that would appear in CRM records
- Expand abbreviations (e.g. "opps" → "opportunities")
- Include relevant entity names, statuses, or field values mentioned
- If the question is conversational or vague, extract the core CRM data need
- Do NOT include explanations or formatting`,
          },
          {
            role: "user",
            content: historyContext
              ? `Recent conversation:\n${historyContext}\n\nCurrent question: ${userMessage}`
              : userMessage,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      });

      const ragQuery = completion.choices[0].message.content.trim();
      console.log(`RAG Query: "${userMessage}" → "${ragQuery}"`);
      return ragQuery;
    } catch (error) {
      console.error(
        "RAG query generation failed, using original:",
        error.message,
      );
      return userMessage;
    }
  }

  async generateTitle(message) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "Generate a short title (max 6 words) for this chat conversation. Reply with only the title, no quotes.",
          },
          { role: "user", content: message },
        ],
        temperature: 0.5,
        max_tokens: 20,
      });
      return completion.choices[0].message.content.trim();
    } catch {
      return "CRM Chat";
    }
  }
}

module.exports = new AIService();
