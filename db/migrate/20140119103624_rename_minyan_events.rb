class RenameEvents < ActiveRecord::Migration
  def change
    rename_table :events, :events
    rename_column :rsvps, :event_id, :event_id
    
  end
end
