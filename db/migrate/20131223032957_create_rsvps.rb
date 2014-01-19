class CreateRsvps < ActiveRecord::Migration
  def change
    create_join_table :events, :yids, table_name: :rsvps do |t|
      t.index :event_id
      t.index :yid_id

      t.timestamps
    end
  end
end
