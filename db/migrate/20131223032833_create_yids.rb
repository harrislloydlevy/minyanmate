class CreateYids < ActiveRecord::Migration
  def change
    create_table :yids do |t|
      t.string :name
      t.string :email
      t.string :phone

      t.timestamps
    end
  end
end
