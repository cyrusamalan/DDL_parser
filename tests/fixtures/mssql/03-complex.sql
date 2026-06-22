USE [ProductionDB];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE TABLE [auth].[role] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [name] NVARCHAR(100) NOT NULL,
  [parent_id] INT NULL,
  CONSTRAINT [PK_role] PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY];
GO

CREATE TABLE [dbo].[tenant] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [name] NVARCHAR(200) NOT NULL,
  [parent_id] INT NULL,
  [status] NVARCHAR(20) NOT NULL DEFAULT 'active',
  CONSTRAINT [PK_tenant] PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY];
GO

CREATE TABLE [dbo].[account] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [tenant_id] INT NOT NULL,
  [role_id] INT NOT NULL,
  [email] NVARCHAR(255) NOT NULL,
  [created_by] INT NULL,
  CONSTRAINT [PK_account] PRIMARY KEY CLUSTERED ([id] ASC),
  CONSTRAINT [UQ_account_email] UNIQUE NONCLUSTERED ([email] ASC)
) ON [PRIMARY];
GO

CREATE TABLE [dbo].[resource] (
  [id] BIGINT IDENTITY(1,1) NOT NULL,
  [tenant_id] INT NOT NULL,
  [owner_id] INT NOT NULL,
  [parent_id] BIGINT NULL,
  [type] NVARCHAR(50) NOT NULL,
  CONSTRAINT [PK_resource] PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY];
GO

CREATE VIEW [dbo].[ActiveAccounts] AS
  SELECT [id], [email] FROM [dbo].[account] WHERE [status] = 'active';
GO
CREATE PROCEDURE [dbo].[sp_GetAccount] @id INT AS
  SELECT * FROM [dbo].[account] WHERE [id] = @id;
GO
CREATE NONCLUSTERED INDEX [IX_account_tenant] ON [dbo].[account] ([tenant_id] ASC);
GO
CREATE NONCLUSTERED INDEX [IX_resource_tenant] ON [dbo].[resource] ([tenant_id] ASC);
GO
CREATE NONCLUSTERED INDEX [IX_resource_owner] ON [dbo].[resource] ([owner_id] ASC);
GO

ALTER TABLE [auth].[role]
  ADD CONSTRAINT [FK_role_parent] FOREIGN KEY ([parent_id])
  REFERENCES [auth].[role] ([id]);
GO

ALTER TABLE [dbo].[tenant]
  ADD CONSTRAINT [FK_tenant_parent] FOREIGN KEY ([parent_id])
  REFERENCES [dbo].[tenant] ([id]);
GO

ALTER TABLE [dbo].[account]
  ADD CONSTRAINT [FK_account_tenant] FOREIGN KEY ([tenant_id])
  REFERENCES [dbo].[tenant] ([id]);
GO

ALTER TABLE [dbo].[account]
  ADD CONSTRAINT [FK_account_role] FOREIGN KEY ([role_id])
  REFERENCES [auth].[role] ([id]);
GO

ALTER TABLE [dbo].[account]
  ADD CONSTRAINT [FK_account_created_by] FOREIGN KEY ([created_by])
  REFERENCES [dbo].[account] ([id]);
GO

ALTER TABLE [dbo].[resource]
  ADD CONSTRAINT [FK_resource_tenant] FOREIGN KEY ([tenant_id])
  REFERENCES [dbo].[tenant] ([id]);
GO

ALTER TABLE [dbo].[resource]
  ADD CONSTRAINT [FK_resource_owner] FOREIGN KEY ([owner_id])
  REFERENCES [dbo].[account] ([id]);
GO

ALTER TABLE [dbo].[resource]
  ADD CONSTRAINT [FK_resource_parent] FOREIGN KEY ([parent_id])
  REFERENCES [dbo].[resource] ([id]);
GO
