class CreateEvents < ActiveRecord::Migration
  def change
    create_table :events do |t|
      t.date :date
      t.references :minyan, index: true

      t.timestamps
    end
  end
end
