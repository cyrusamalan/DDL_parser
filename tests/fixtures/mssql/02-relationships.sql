CREATE TABLE [dbo].[user] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [email] NVARCHAR(255) NOT NULL,
  [manager_id] INT NULL,
  [status] NVARCHAR(20) NOT NULL DEFAULT 'active',
  CONSTRAINT [PK_user] PRIMARY KEY CLUSTERED ([id] ASC),
  CONSTRAINT [UQ_user_email] UNIQUE ([email])
) ON [PRIMARY];
GO

CREATE TABLE [dbo].[group] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [name] NVARCHAR(100) NOT NULL,
  [owner_id] INT NOT NULL,
  [parent_group_id] INT NULL,
  CONSTRAINT [PK_group] PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY];
GO

CREATE TABLE [dbo].[order] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [user_id] INT NOT NULL,
  [group_id] INT NULL,
  [status] NVARCHAR(20) NOT NULL DEFAULT 'pending',
  [total] DECIMAL(18,2) NOT NULL DEFAULT 0,
  CONSTRAINT [PK_order] PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY];
GO

CREATE NONCLUSTERED INDEX [IX_user_manager] ON [dbo].[user] ([manager_id] ASC);
GO
CREATE NONCLUSTERED INDEX [IX_order_user] ON [dbo].[order] ([user_id] ASC);
GO
CREATE NONCLUSTERED INDEX [IX_order_group] ON [dbo].[order] ([group_id] ASC);
GO

ALTER TABLE [dbo].[user]
  ADD CONSTRAINT [FK_user_manager] FOREIGN KEY ([manager_id])
  REFERENCES [dbo].[user] ([id]);
GO

ALTER TABLE [dbo].[group]
  ADD CONSTRAINT [FK_group_owner] FOREIGN KEY ([owner_id])
  REFERENCES [dbo].[user] ([id]);
GO

ALTER TABLE [dbo].[group]
  ADD CONSTRAINT [FK_group_parent] FOREIGN KEY ([parent_group_id])
  REFERENCES [dbo].[group] ([id]);
GO

ALTER TABLE [dbo].[order]
  ADD CONSTRAINT [FK_order_user] FOREIGN KEY ([user_id])
  REFERENCES [dbo].[user] ([id]);
GO

ALTER TABLE [dbo].[order]
  ADD CONSTRAINT [FK_order_group] FOREIGN KEY ([group_id])
  REFERENCES [dbo].[group] ([id]);
GO
