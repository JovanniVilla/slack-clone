export type TableNames =
  | 'users'
  | 'workspaces'
  | 'members'
  | 'channels'
  | 'conversations'
  | 'messages'
  | 'reactions'
  | '_storage';

export type Id<TableName extends TableNames | string = string> = string & {
  __tableName?: TableName;
};

export type Doc<TableName extends TableNames | string = string> = Record<string, any>;
