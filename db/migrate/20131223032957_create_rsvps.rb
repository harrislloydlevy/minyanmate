class CreateRsvps < ActiveRecord::Migration
  def change
    create_join_table :minyan_events, :yids, table_name: :rsvps do |t|
      t.index :minyan_event_id
      t.index :yid_id

      t.timestamps
    end
  end
end
