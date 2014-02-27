class RenameMinyanEvents < ActiveRecord::Migration
  def change
    rename_table :minyan_events, :events
    rename_column :rsvps, :minyan_event_id, :event_id
  end
end
