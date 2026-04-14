const suitecrmService = require("./suitecrmService");
const mysqlService = require("./mysqlService");

class SyncService {
  async syncModule(moduleName) {
    const logId = await mysqlService.createSyncLog(moduleName);

    try {
      console.log(`Syncing ${moduleName}...`);
      const records = await suitecrmService.getAllRecords(moduleName);

      await mysqlService.updateSyncLog(logId, "completed", records.length);
      console.log(`Synced ${records.length} records for ${moduleName}`);
      return { module: moduleName, synced: records.length };
    } catch (error) {
      await mysqlService.updateSyncLog(logId, "failed", 0, error.message);
      console.error(`Sync failed for ${moduleName}:`, error.message);
      throw error;
    }
  }

  async syncAll(
    modules = ["Contacts", "Accounts", "Leads", "Opportunities", "Cases"],
  ) {
    const results = [];

    for (const mod of modules) {
      try {
        const result = await this.syncModule(mod);
        results.push(result);
      } catch (error) {
        results.push({ module: mod, synced: 0, error: error.message });
      }
    }

    return {
      status: "completed",
      totalSynced: results.reduce((sum, r) => sum + (r.synced || 0), 0),
      details: results,
    };
  }
}

module.exports = new SyncService();
