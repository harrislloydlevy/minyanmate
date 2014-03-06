class AddIdToRsvps < ActiveRecord::Migration
  def change
    add_column :rsvps, :id, :primary_key
    add_index :rsvps, :id
  end
end
