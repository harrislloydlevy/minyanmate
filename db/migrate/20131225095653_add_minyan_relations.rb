class AddMinyanRelations < ActiveRecord::Migration
  def change
    create_join_table :minyans, :yids, table_name: :regulars do |t|
      t.index :minyan_id
      t.index :yid_id
    end

    add_column :minyans, :owner_id, :integer
    add_index :minyans, :owner_id
  end
end
