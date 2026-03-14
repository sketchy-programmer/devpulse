/**
 * DevPulse E2E Tests — Phase 5: Integrated System Testing
 */

const TEAM_SLUG = 'my-team';
const AGENT_KEY = 'd3492a5d896ddc838ec9feab9c639ba35a7897bc9e0830584144d88c383ceb0c';

const login = () => {
  cy.get('input').first().clear().type(TEAM_SLUG);
  cy.get('input').last().clear().type(AGENT_KEY);
  cy.contains('Enter dashboard').click();
  cy.contains('My Team', { timeout: 15000 }).should('be.visible');
};

describe('DevPulse Dashboard', () => {

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('http://localhost:3000');
  });

  describe('Login page', () => {
    it('shows the login form on first visit', () => {
      cy.contains('DevPulse').should('be.visible');
      cy.contains('Team health monitoring').should('be.visible');
      cy.get('input').should('have.length', 2);
      cy.contains('Enter dashboard').should('be.visible');
    });

    it('shows error with wrong credentials', () => {
      cy.get('input').first().type('wrong-team');
      cy.get('input').last().type('wrong-key');
      cy.contains('Enter dashboard').click();
      cy.contains('Invalid credentials', { timeout: 8000 }).should('be.visible');
    });

    it('logs in successfully with correct credentials', () => {
      cy.get('input').first().type(TEAM_SLUG);
      cy.get('input').last().type(AGENT_KEY);
      cy.contains('Enter dashboard').click();
      cy.url().should('eq', 'http://localhost:3000/', { timeout: 15000 });
      cy.contains('My Team', { timeout: 15000 }).should('be.visible');
    });

    it('persists login on page refresh', () => {
      cy.get('input').first().type(TEAM_SLUG);
      cy.get('input').last().type(AGENT_KEY);
      cy.contains('Enter dashboard').click();
      cy.contains('My Team', { timeout: 15000 }).should('be.visible');
      cy.reload();
      cy.contains('My Team', { timeout: 15000 }).should('be.visible');
    });
  });

  describe('Dashboard', () => {
    beforeEach(() => {
      login();
    });

    it('shows all 4 summary cards', () => {
      cy.contains('Metric samples').should('be.visible');
      cy.contains('Pipeline pass rate').should('be.visible');
      cy.contains('Avg build time').should('be.visible');
      cy.contains('Current alert level').should('be.visible');
    });

    it('shows server health section', () => {
      cy.contains('Server health').should('be.visible');
    });

    it('shows CI/CD pipeline section', () => {
      cy.contains('CI/CD pipeline').should('be.visible');
    });

    it('shows velocity chart', () => {
      cy.contains('Sprint velocity', { timeout: 8000 }).should('be.visible');
    });

    it('refresh button triggers data reload', () => {
      cy.contains('↻ Refresh').click();
      cy.contains('Updated').should('be.visible');
    });

    it('sign out returns to login page', () => {
      cy.contains('Sign out').click();
      cy.contains('Team health monitoring').should('be.visible');
      cy.get('input').should('have.length', 2);
    });
  });

  describe('Security', () => {
    it('blocks invalid credentials', () => {
      cy.get('input').first().type('my-team');
      cy.get('input').last().type('fakekeynotreal');
      cy.contains('Enter dashboard').click();
      cy.contains('Invalid credentials', { timeout: 8000 }).should('be.visible');
      cy.contains('My Team').should('not.exist');
    });
  });

});
