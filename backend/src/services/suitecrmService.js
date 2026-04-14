const axios = require("axios");
const crypto = require("crypto");
const config = require("../config");

class SuiteCRMService {
  constructor() {
    this.baseUrl = config.suitecrm.url;
    this.sessionId = null;
  }

  async authenticate() {
    try {
      const md5Password = crypto
        .createHash("md5")
        .update(config.suitecrm.password)
        .digest("hex");

      const response = await axios.post(
        `${this.baseUrl}/service/v4_1/rest.php`,
        null,
        {
          params: {
            method: "login",
            input_type: "JSON",
            response_type: "JSON",
            rest_data: JSON.stringify({
              user_auth: {
                user_name: config.suitecrm.username,
                password: md5Password,
              },
            }),
          },
        },
      );

      if (response.data.id) {
        this.sessionId = response.data.id;
        return this.sessionId;
      }
      throw new Error(response.data.description || "Login failed");
    } catch (error) {
      console.error(
        "SuiteCRM Auth Error:",
        error.response?.data || error.message,
      );
      throw new Error("Failed to authenticate with SuiteCRM");
    }
  }

  async getSession() {
    if (!this.sessionId) {
      await this.authenticate();
    }
    return this.sessionId;
  }

  async apiCall(method, restData = {}) {
    const session = await this.getSession();

    try {
      const response = await axios.post(
        `${this.baseUrl}/service/v4_1/rest.php`,
        null,
        {
          params: {
            method,
            input_type: "JSON",
            response_type: "JSON",
            rest_data: JSON.stringify({ session, ...restData }),
          },
        },
      );

      // Check for session expired
      if (
        response.data?.name === "Invalid Session ID" ||
        response.data?.number === 11
      ) {
        this.sessionId = null;
        return this.apiCall(method, restData);
      }

      return response.data;
    } catch (error) {
      console.error(
        `SuiteCRM API Error [${method}]:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async getModuleRecords(module, page = 1, pageSize = 20, filters = {}) {
    const offset = (page - 1) * pageSize;

    const result = await this.apiCall("get_entry_list", {
      module_name: module,
      query: filters.query || "",
      order_by: filters.sort || "",
      offset,
      select_fields: filters.fields || [],
      link_name_to_fields_array: [],
      max_results: pageSize,
      deleted: 0,
    });

    // Transform V4 response to match expected format
    const data = (result.entry_list || []).map((entry) => {
      const attrs = {};
      Object.entries(entry.name_value_list || {}).forEach(([key, val]) => {
        attrs[key] = val.value;
      });
      return { id: entry.id, type: module, attributes: attrs };
    });

    return {
      data,
      meta: {
        "total-pages": Math.ceil(
          parseInt(result.total_count || "0") / pageSize,
        ),
        "total-count": parseInt(result.total_count || "0"),
      },
    };
  }

  async getRecord(module, id) {
    const result = await this.apiCall("get_entry", {
      module_name: module,
      id,
      select_fields: [],
      link_name_to_fields_array: [],
    });

    if (result.entry_list && result.entry_list[0]) {
      const entry = result.entry_list[0];
      const attrs = {};
      Object.entries(entry.name_value_list || {}).forEach(([key, val]) => {
        attrs[key] = val.value;
      });
      return { data: { id: entry.id, type: module, attributes: attrs } };
    }

    throw new Error("Record not found");
  }

  async getAllRecords(module, fields = null, maxRecords = 5000) {
    const allRecords = [];
    let page = 1;
    const pageSize = 100;

    while (allRecords.length < maxRecords) {
      const filters = {};
      if (fields) filters.fields = fields;

      const response = await this.getModuleRecords(
        module,
        page,
        pageSize,
        filters,
      );

      if (!response.data || response.data.length === 0) break;
      allRecords.push(...response.data);

      if (response.data.length < pageSize) break;
      page++;
    }

    return allRecords;
  }

  async getModuleStats(module) {
    try {
      const records = await this.getModuleRecords(module, 1, 1);
      const total = records.meta?.["total-count"] || records.data?.length || 0;
      return { module, total };
    } catch {
      return { module, total: 0 };
    }
  }

  async getDashboardStats() {
    const modules = ["Contacts", "Accounts", "Leads", "Opportunities", "Cases"];
    const statsPromises = modules.map((m) => this.getModuleStats(m));
    const stats = await Promise.all(statsPromises);

    const result = {};
    stats.forEach((s) => {
      result[s.module.toLowerCase()] = s.total;
    });

    // Get open opportunities
    try {
      const opps = await this.getModuleRecords("Opportunities", 1, 100, {
        fields: ["name", "amount", "sales_stage", "date_closed"],
      });
      const openOpps = (opps.data || []).filter(
        (o) =>
          o.attributes.sales_stage !== "Closed Won" &&
          o.attributes.sales_stage !== "Closed Lost",
      );
      result.open_opportunities_value = openOpps.reduce(
        (sum, o) => sum + parseFloat(o.attributes.amount || 0),
        0,
      );
    } catch {
      result.open_opportunities_value = 0;
    }

    return result;
  }

  flattenRecord(record) {
    return {
      id: record.id,
      type: record.type,
      ...record.attributes,
    };
  }

  recordToText(record, module) {
    const flat = this.flattenRecord(record);
    const parts = [`[${module}] ID: ${flat.id}`];

    const importantFields = {
      Contacts: [
        "first_name",
        "last_name",
        "email1",
        "phone_work",
        "title",
        "account_name",
        "lead_source",
        "description",
      ],
      Accounts: [
        "name",
        "industry",
        "phone_office",
        "billing_address_city",
        "billing_address_country",
        "website",
        "description",
      ],
      Leads: [
        "first_name",
        "last_name",
        "email1",
        "status",
        "lead_source",
        "phone_work",
        "company",
        "description",
      ],
      Opportunities: [
        "name",
        "amount",
        "sales_stage",
        "date_closed",
        "lead_source",
        "probability",
        "description",
      ],
      Cases: [
        "name",
        "status",
        "priority",
        "type",
        "description",
        "resolution",
      ],
    };

    const fields = importantFields[module] || Object.keys(flat);
    fields.forEach((field) => {
      if (
        flat[field] &&
        flat[field] !== "" &&
        field !== "id" &&
        field !== "type"
      ) {
        parts.push(`${field}: ${flat[field]}`);
      }
    });

    return parts.join(" | ");
  }

  async getModuleInsights(module, groupByField, filters = {}) {
    const allRecords = await this.getAllRecords(module, null, 5000);
    const grouped = {};

    allRecords.forEach((record) => {
      const flat = this.flattenRecord(record);
      const key = flat[groupByField] || "Unknown";
      if (!grouped[key]) grouped[key] = { count: 0, records: [] };
      grouped[key].count++;
      grouped[key].records.push(flat);
    });

    // Build summary
    const summary = Object.entries(grouped)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([key, val]) => ({ value: key, count: val.count }));

    return {
      module,
      groupBy: groupByField,
      total: allRecords.length,
      breakdown: summary,
    };
  }

  async getOpportunityPipeline() {
    const allRecords = await this.getAllRecords("Opportunities", null, 5000);
    const stages = {};
    let totalValue = 0;

    allRecords.forEach((record) => {
      const flat = this.flattenRecord(record);
      const stage = flat.sales_stage || "Unknown";
      const amount = parseFloat(flat.amount || 0);
      if (!stages[stage]) stages[stage] = { count: 0, value: 0 };
      stages[stage].count++;
      stages[stage].value += amount;
      totalValue += amount;
    });

    const pipeline = Object.entries(stages)
      .sort((a, b) => b[1].value - a[1].value)
      .map(([stage, data]) => ({
        stage,
        count: data.count,
        value: data.value,
      }));

    return {
      total_opportunities: allRecords.length,
      total_value: totalValue,
      pipeline,
    };
  }

  async getFullModuleData(module) {
    const keyFields = {
      Leads: [
        "salutation",
        "first_name",
        "last_name",
        "email1",
        "status",
        "lead_source",
        "phone_work",
        "company",
        "industry",
        "assigned_user_name",
        "date_entered",
        "converted",
      ],
      Contacts: [
        "salutation",
        "first_name",
        "last_name",
        "email1",
        "phone_work",
        "title",
        "account_name",
        "lead_source",
        "assigned_user_name",
        "date_entered",
      ],
      Accounts: [
        "name",
        "industry",
        "account_type",
        "phone_office",
        "billing_address_city",
        "billing_address_country",
        "website",
        "assigned_user_name",
        "date_entered",
      ],
      Opportunities: [
        "name",
        "amount",
        "sales_stage",
        "date_closed",
        "lead_source",
        "probability",
        "account_name",
        "assigned_user_name",
        "date_entered",
      ],
      Cases: [
        "name",
        "status",
        "priority",
        "type",
        "account_name",
        "assigned_user_name",
        "date_entered",
        "resolution",
      ],
    };

    const fields = keyFields[module] || [];
    const allRecords = await this.getAllRecords(
      module,
      ["id", ...fields],
      10000,
    );

    // Build condensed records array
    const records = allRecords.map((record) => {
      const flat = this.flattenRecord(record);
      const condensed = {};
      for (const f of fields) {
        if (flat[f] && flat[f] !== "") condensed[f] = flat[f];
      }
      return condensed;
    });

    // Build automatic aggregations
    const aggregations = {};
    for (const f of fields) {
      if (
        [
          "amount",
          "probability",
          "phone_work",
          "phone_office",
          "email1",
          "website",
          "first_name",
          "last_name",
          "name",
          "resolution",
          "date_entered",
          "date_closed",
        ].includes(f)
      )
        continue;
      const counts = {};
      for (const r of records) {
        const val = r[f] || "Empty";
        counts[val] = (counts[val] || 0) + 1;
      }
      if (Object.keys(counts).length <= 50) {
        aggregations[f] = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([value, count]) => ({ value, count }));
      }
    }

    // For Opportunities, calculate financial summaries
    let financials = null;
    if (module === "Opportunities") {
      let totalValue = 0;
      const byStage = {};
      for (const r of records) {
        const amt = parseFloat(r.amount || 0);
        totalValue += amt;
        const stage = r.sales_stage || "Unknown";
        if (!byStage[stage]) byStage[stage] = { count: 0, value: 0 };
        byStage[stage].count++;
        byStage[stage].value += amt;
      }
      financials = { total_value: totalValue, by_stage: byStage };
    }

    return {
      module,
      total_records: records.length,
      fields_included: fields,
      aggregations,
      financials,
      sample_records: records.slice(0, 50),
      note:
        records.length > 50
          ? `Showing 50 sample records out of ${records.length} total. Aggregations above cover ALL ${records.length} records.`
          : undefined,
    };
  }

  async searchRecords(module, query, field, limit = 20) {
    const result = await this.apiCall("get_entry_list", {
      module_name: module,
      query: query
        ? `${module.toLowerCase()}.${field} LIKE '%${query.replace(/'/g, "\\'")}%'`
        : "",
      order_by: "",
      offset: 0,
      select_fields: [],
      link_name_to_fields_array: [],
      max_results: limit,
      deleted: 0,
    });

    return (result.entry_list || []).map((entry) => {
      const attrs = {};
      Object.entries(entry.name_value_list || {}).forEach(([key, val]) => {
        attrs[key] = val.value;
      });
      return { id: entry.id, ...attrs };
    });
  }
}

module.exports = new SuiteCRMService();
