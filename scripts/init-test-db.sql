-- Runs once on first container start. Both suites need databases separate from the one the
-- dev server uses: the integration suite truncates between tests, and the e2e run drives the
-- real app against a real database.
CREATE DATABASE dsg_test OWNER dsg;
CREATE DATABASE dsg_e2e OWNER dsg;
