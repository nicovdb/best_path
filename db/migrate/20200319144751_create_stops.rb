class CreateStops < ActiveRecord::Migration[5.2]
  def change
    create_table :stops do |t|
      t.references :trip, foreign_key: true
      t.float :latitude
      t.float :longitude
      t.string :address
      t.string :name
      t.boolean :final

      t.timestamps
    end
  end
end
