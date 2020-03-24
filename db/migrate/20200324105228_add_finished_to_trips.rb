class AddFinishedToTrips < ActiveRecord::Migration[5.2]
  def change
    add_column :trips, :finished, :boolean, default: false
    change_column_default :stops, :final, false
  end
end
