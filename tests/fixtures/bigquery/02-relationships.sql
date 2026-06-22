CREATE TABLE `company-data.hr.departments` (
  department_id INT64 NOT NULL,
  dept_name STRING NOT NULL,
  parent_dept_id INT64 REFERENCES `company-data.hr.departments` (department_id) NOT ENFORCED,
  budget BIGNUMERIC(15, 2),
  PRIMARY KEY (department_id) NOT ENFORCED
)
PARTITION BY RANGE_BUCKET(department_id, GENERATE_ARRAY(0, 1000, 100));

CREATE TABLE `company-data.hr.employees` (
  employee_id INT64 NOT NULL,
  full_name STRING NOT NULL,
  email STRING NOT NULL,
  department_id INT64 NOT NULL,
  manager_id INT64,
  hire_date DATE,
  salary BIGNUMERIC(12, 2),
  skills ARRAY<STRING>,
  profile STRUCT<title STRING, level INT64>,
  PRIMARY KEY (employee_id) NOT ENFORCED,
  CONSTRAINT fk_emp_dept FOREIGN KEY (department_id)
    REFERENCES `company-data.hr.departments` (department_id) NOT ENFORCED,
  CONSTRAINT fk_emp_manager FOREIGN KEY (manager_id)
    REFERENCES `company-data.hr.employees` (employee_id) NOT ENFORCED
)
PARTITION BY hire_date
CLUSTER BY department_id;

CREATE TABLE `company-data.hr.projects` (
  project_id INT64 NOT NULL,
  project_name STRING NOT NULL,
  lead_employee_id INT64 NOT NULL,
  dept_id INT64 NOT NULL,
  budget FLOAT64,
  tags ARRAY<STRING>,
  PRIMARY KEY (project_id) NOT ENFORCED,
  CONSTRAINT fk_proj_lead FOREIGN KEY (lead_employee_id)
    REFERENCES `company-data.hr.employees` (employee_id) NOT ENFORCED,
  CONSTRAINT fk_proj_dept FOREIGN KEY (dept_id)
    REFERENCES `company-data.hr.departments` (department_id) NOT ENFORCED
)
OPTIONS (
  partition_expiration_days = 365
);
