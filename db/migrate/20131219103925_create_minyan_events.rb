class CreateMinyanEvents < ActiveRecord::Migration
  def change
    create_table :minyan_events do |t|
      t.date :date
      t.references :minyan, index: true

      t.timestamps
    end
  end
end
