class CreateMinyans < ActiveRecord::Migration
  def change
    create_table :minyans do |t|
      t.string :title
      t.text :description
      t.boolean :sun
      t.boolean :mon
      t.boolean :tue
      t.boolean :wed
      t.boolean :thu
      t.boolean :fri
      t.boolean :sat

      t.timestamps
    end
  end
end
