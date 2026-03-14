const https = require('https');

const jiraRequest = (path) => {
  const domain = process.env.JIRA_DOMAIN;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!domain || !email || !token) return Promise.reject(new Error('Jira not configured'));

  const auth = Buffer.from(`${email}:${token}`).toString('base64');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: domain,
      path: `/${path}`,
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Invalid JSON from Jira: ${data.substring(0, 100)}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

const getVelocity = async (req, res, next) => {
  try {
    const projectKey = process.env.JIRA_PROJECT_KEY || 'DEV';

    // Get boards
    const boardsData = await jiraRequest(`rest/agile/1.0/board?projectKeyOrId=${projectKey}`);
    const board = boardsData.values?.[0];
    if (!board) return res.json({ sprints: [] });

    // Get sprints
    const sprintsData = await jiraRequest(`rest/agile/1.0/board/${board.id}/sprint?state=active,closed`);
    const sprints = sprintsData.values || [];

    // Get issues per sprint
    const velocity = await Promise.all(
      sprints.slice(-8).map(async (sprint) => {
        try {
          const issues = await jiraRequest(
            `rest/agile/1.0/sprint/${sprint.id}/issue?fields=customfield_10016,status&maxResults=100`
          );

          const completed = (issues.issues || [])
            .filter(i => i.fields.status?.statusCategory?.key === 'done')
            .reduce((sum, i) => sum + (i.fields.customfield_10016 || 1), 0);

          const total = (issues.issues || [])
            .reduce((sum, i) => sum + (i.fields.customfield_10016 || 1), 0);

          return {
            id: sprint.id,
            name: sprint.name,
            state: sprint.state,
            completed: Math.round(completed),
            total: Math.round(total),
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          };
        } catch {
          return { id: sprint.id, name: sprint.name, completed: 0, total: 0, completionRate: 0 };
        }
      })
    );

    return res.json({ projectKey, board: board.name, sprints: velocity });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getVelocity };
